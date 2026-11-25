import "server-only";

import { cache } from "react";
import { createRequestClient } from "@/platform/db/server";
import { getEnv } from "@/platform/env";
import { logger, userRef } from "@/platform/logger";
import { safeNextPath } from "@/platform/auth/redirect";
import type { Role, Viewer } from "@/platform/auth/types";

/**
 * The authentication adapter.
 *
 * This is the only file that knows which provider issues sessions. Feature
 * modules depend on the types in ./types, so replacing the provider means
 * rewriting this file and the two SQL helpers the policies call
 * (decision D-027).
 *
 * Identity is always resolved server-side with getUser(), which verifies the
 * token with the auth service. Claims are never read from a cookie and
 * trusted, and a user id is never taken from client input.
 */

export class AuthError extends Error {
  readonly code: "EMAIL_TAKEN" | "RATE_LIMITED" | "PROVIDER_DISABLED" | "FAILED";

  constructor(code: AuthError["code"], message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

function redirectUrl(nextPath: string): string {
  const base = getEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}

/**
 * The current viewer, verified against the auth service, with the roles held
 * in our own table. Memoised for the lifetime of one request.
 */
export const getViewer = cache(async function getViewer(): Promise<Viewer | null> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role");

  const roles = (roleRows ?? [])
    .map((row) => row.role as Role)
    .filter((role): role is Role => role === "moderator" || role === "admin");

  return {
    userId: data.user.id,
    // The flag comes from the verified token, not from a column a viewer
    // could edit. The same claim drives the database policies.
    isGuest: data.user.is_anonymous === true,
    roles,
  };
});

/** Sends a magic link. The caller must not reveal whether the address is known. */
export async function signInWithEmail(email: string, nextPath: string): Promise<void> {
  const supabase = await createRequestClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl(nextPath) },
  });

  if (error) {
    logger.warn({ event: "auth_magic_link_failed", code: error.code ?? "unknown" });

    if (error.status === 429) {
      throw new AuthError("RATE_LIMITED", "Too many attempts. Please try again shortly.");
    }

    throw new AuthError("FAILED", "We could not send the link. Please try again.");
  }
}

/** Starts an OAuth flow and returns the URL to send the browser to. */
export async function signInWithProvider(
  provider: "google",
  nextPath: string,
): Promise<{ url: string }> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl(nextPath), skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    logger.warn({ event: "auth_oauth_failed", code: error?.code ?? "unknown" });
    throw new AuthError(
      "PROVIDER_DISABLED",
      "That sign-in method is not available right now.",
    );
  }

  return { url: data.url };
}

/**
 * Makes sure there is an account to attribute work to.
 *
 * A guest account is created on the first action a visitor takes, not on page
 * view, so browsing creates nothing. From then on the guest is an ordinary
 * account to every policy: one code path, one set of rules.
 */
export async function ensureGuest(): Promise<Viewer> {
  const existing = await getViewer();

  if (existing) {
    return existing;
  }

  const supabase = await createRequestClient();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    logger.warn({ event: "auth_guest_failed", code: error?.code ?? "unknown" });
    throw new AuthError("FAILED", "We could not start a session. Please try again.");
  }

  logger.info({ event: "auth_guest_created", userRef: userRef(data.user.id) });

  return { userId: data.user.id, isGuest: true, roles: [] };
}

export type UpgradeOutcome =
  | { status: "confirmation_sent" }
  | { status: "email_taken" };

/**
 * Attaches an email address to the account the visitor is already using.
 *
 * Nothing is copied or moved: the guest account becomes the registered
 * account, so everything done as a guest is still there afterwards.
 *
 * If the address already belongs to someone, the upgrade is refused rather
 * than forced. The caller signs the person into their existing account and
 * records the collision; an existing account is never overwritten.
 */
export async function upgradeGuest(email: string): Promise<UpgradeOutcome> {
  const viewer = await getViewer();

  if (!viewer) {
    throw new AuthError("FAILED", "There is no session to upgrade.");
  }

  if (!viewer.isGuest) {
    throw new AuthError("FAILED", "This account is already registered.");
  }

  const supabase = await createRequestClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: redirectUrl("/you") },
  );

  if (!error) {
    return { status: "confirmation_sent" };
  }

  // The provider reports a taken address with a distinct code; anything else
  // is a genuine failure.
  if (error.code === "email_exists" || error.status === 422) {
    logger.info({ event: "auth_upgrade_collision", userRef: userRef(viewer.userId) });
    return { status: "email_taken" };
  }

  logger.warn({ event: "auth_upgrade_failed", code: error.code ?? "unknown" });
  throw new AuthError("FAILED", "We could not add that address. Please try again.");
}

export async function signOut(options: { everywhere?: boolean } = {}): Promise<void> {
  const supabase = await createRequestClient();
  await supabase.auth.signOut({ scope: options.everywhere ? "global" : "local" });
}

/** Completes a magic-link or OAuth sign-in. Returns whether it worked. */
export async function completeSignIn(code: string): Promise<boolean> {
  const supabase = await createRequestClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn({ event: "auth_callback_failed", code: error.code ?? "unknown" });
    return false;
  }

  return true;
}
