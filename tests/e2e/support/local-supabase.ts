import type { Page } from "@playwright/test";

/**
 * Helpers for the authenticated editorial E2E (Phase 10.13 T7).
 *
 * These drive a REAL LOCAL Supabase stack (PostgREST + GoTrue) — never the hosted
 * project, and never by bypassing the app's own authorization. They are a no-op
 * unless the local stack is configured, so the suite skips cleanly where it is
 * not available (e.g. a container without Docker). Test identities are explicit,
 * labelled, local-only accounts.
 */

export type LocalEnv = {
  supabaseUrl: string;
  /** LOCAL service-role key — used only to mint sessions for labelled test users. */
  serviceKey: string;
};

/** Reads the local-stack configuration, or null when it is not available. */
export function localEnv(): LocalEnv | null {
  const supabaseUrl = process.env.E2E_SUPABASE_URL;
  const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
  if (process.env.E2E_LOCAL_SUPABASE !== "1" || !supabaseUrl || !serviceKey) {
    return null;
  }
  return { supabaseUrl, serviceKey };
}

/** Explicit, labelled local test identities. Never real users, never hosted. */
export const TEST_IDENTITIES = {
  adminA: "e2e-admin-a@vshares.local",
  moderatorB: "e2e-moderator-b@vshares.local",
  ordinary: "e2e-ordinary@vshares.local",
} as const;

/**
 * Establish a signed-in session for a labelled test identity by asking the LOCAL
 * GoTrue admin API for a magic link and following it. Does not touch the hosted
 * project and does not bypass the app: the app verifies the session itself.
 */
export async function signInAs(page: Page, env: LocalEnv, email: string): Promise<void> {
  const res = await fetch(`${env.supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: env.serviceKey,
      Authorization: `Bearer ${env.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  if (!res.ok) {
    throw new Error(`generate_link failed for ${email}: ${res.status}`);
  }
  const link = (await res.json()) as { action_link?: string };
  if (!link.action_link) {
    throw new Error(`no action_link returned for ${email}`);
  }
  // Following the magic link sets the session cookie via the app's callback.
  await page.goto(link.action_link);
  await page.waitForLoadState("networkidle");
}

export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
}
