"use server";

import { z } from "zod";
import { defineAction } from "@/platform/action";
import { fail, failWithDefault, ok } from "@/platform/result";
import { rateLimitRules } from "@/platform/rate-limit";
import { safeNextPath } from "@/platform/auth/redirect";
import {
  AuthError,
  ensureGuest as ensureGuestSession,
  getViewer,
  signInWithEmail,
  signInWithProvider,
  signOut as endSession,
  upgradeGuest as upgradeGuestSession,
} from "@/platform/auth/provider";
import {
  providerSignInInput,
  signInInput,
  signOutInput,
  updateProfileInput,
  upgradeGuestInput,
} from "./schemas";
import {
  deleteMyAccount,
  exportMyData,
  findOwnProfile,
  recordMerge,
  updateOwnProfile,
} from "./repository";
import type { Profile } from "./types";

/**
 * Server actions for identity and profiles.
 *
 * Each one runs through the platform pipeline: rate limit, authenticate,
 * authorise, validate, execute, record, respond. Authorisation is never left
 * to the caller, and the database enforces the same rules again.
 */

export const requestMagicLink = defineAction({
  name: "profiles.requestMagicLink",
  access: "public",
  input: signInInput,
  rateLimit: rateLimitRules.magicLinkPerEmail,
  handler: async ({ email, next }) => {
    try {
      await signInWithEmail(email, safeNextPath(next));
    } catch (error) {
      if (error instanceof AuthError && error.code === "RATE_LIMITED") {
        return failWithDefault("RATE_LIMITED");
      }

      // Any other failure is reported the same way as success, so this
      // endpoint cannot be used to discover which addresses have accounts.
    }

    return ok({ sent: true } as const);
  },
});

export const startProviderSignIn = defineAction({
  name: "profiles.startProviderSignIn",
  access: "public",
  input: providerSignInInput,
  rateLimit: rateLimitRules.guestSignInPerIp,
  handler: async ({ provider, next }) => {
    try {
      const { url } = await signInWithProvider(provider, safeNextPath(next));
      return ok({ url });
    } catch {
      return fail("UNAVAILABLE", "That sign-in method is not available right now.");
    }
  },
});

export const signOut = defineAction({
  name: "profiles.signOut",
  access: "viewer",
  input: signOutInput,
  handler: async ({ everywhere }) => {
    await endSession({ everywhere: everywhere === true });
    return ok({} as const);
  },
});

/**
 * Creates the account a visitor's first action is attributed to.
 * Called by features before their first write, never on page view.
 */
export const ensureGuest = defineAction({
  name: "profiles.ensureGuest",
  access: "public",
  input: z.object({}).strict(),
  rateLimit: rateLimitRules.guestSignInPerIp,
  handler: async () => {
    try {
      const viewer = await ensureGuestSession();
      return ok({ userId: viewer.userId, isGuest: viewer.isGuest });
    } catch {
      return fail("UNAVAILABLE", "We could not start a session. Please try again.");
    }
  },
});

/**
 * Turns the guest account the visitor is already using into a registered
 * one. Nothing moves, so nothing can be lost.
 */
type UpgradeResult = { status: "existing_account" | "confirmation_sent" };

export const upgradeGuest = defineAction<{ email: string }, UpgradeResult>({
  name: "profiles.upgradeGuest",
  access: "viewer",
  input: upgradeGuestInput,
  rateLimit: rateLimitRules.magicLinkPerEmail,
  handler: async ({ email }, context) => {
    if (!context.viewer?.isGuest) {
      return fail("FORBIDDEN", "This account is already registered.");
    }

    try {
      const outcome = await upgradeGuestSession(email);

      if (outcome.status === "email_taken") {
        // The address belongs to an existing account. We do not force the
        // two together: the person signs in to the account they already
        // have, and the collision is recorded when they arrive.
        await signInWithEmail(email, "/you?merge=pending");
        return ok({ status: "existing_account" });
      }

      return ok({ status: "confirmation_sent" });
    } catch (error) {
      if (error instanceof AuthError && error.code === "RATE_LIMITED") {
        return failWithDefault("RATE_LIMITED");
      }

      return fail("UNAVAILABLE", "We could not add that address. Please try again.");
    }
  },
});

/**
 * Records a collision after the person has signed in to their existing
 * account. The guest account's data is left alone and the existing
 * account's data is never overwritten; the database function enforces both.
 */
export const recordGuestCollision = defineAction({
  name: "profiles.recordGuestCollision",
  access: "account",
  input: z.object({ guestUserId: z.string().uuid() }).strict(),
  handler: async ({ guestUserId }, context) => {
    if (!context.viewer) {
      return failWithDefault("UNAUTHENTICATED");
    }

    const recorded = await recordMerge(guestUserId, context.viewer.userId);

    if (!recorded) {
      return fail("CONFLICT", "That could not be linked to your account.");
    }

    return ok({ recorded: true } as const);
  },
});

export const getMyProfile = defineAction({
  name: "profiles.getMyProfile",
  access: "viewer",
  input: z.object({}).strict(),
  handler: async (_input, context) => {
    if (!context.viewer) {
      return failWithDefault("UNAUTHENTICATED");
    }

    const profile = await findOwnProfile(
      context.viewer.userId,
      context.viewer.isGuest,
      context.viewer.roles,
    );

    if (!profile) {
      return failWithDefault("NOT_FOUND");
    }

    return ok(profile);
  },
});

export const updateProfile = defineAction({
  name: "profiles.updateProfile",
  access: "viewer",
  input: updateProfileInput,
  rateLimit: { limit: 20, windowSeconds: 60 * 60 },
  handler: async (input, context) => {
    if (!context.viewer) {
      return failWithDefault("UNAUTHENTICATED");
    }

    // A guest has no public presence. The database refuses this too; the
    // check here is so the person gets a sentence rather than a shrug.
    if (input.isPublic === true && context.viewer.isGuest) {
      return fail("FORBIDDEN", "Create an account to make your profile public.", {
        fields: { isPublic: "Available once you have an account." },
      });
    }

    // Only the named fields are written. An omitted field is left alone, so
    // a partial update cannot erase anything.
    const fields: Record<string, unknown> = {};

    if (input.handle !== undefined) {
      fields.handle = input.handle;
    }

    if (input.displayName !== undefined) {
      fields.display_name = input.displayName === null ? null : input.displayName;
    }

    if (input.isPublic !== undefined) {
      fields.is_public = input.isPublic;
    }

    const outcome = await updateOwnProfile(context.viewer.userId, fields);

    if (outcome.status === "handle_taken") {
      return fail("CONFLICT", "That handle is taken. Try another.", {
        fields: { handle: "That handle is taken." },
      });
    }

    if (outcome.status === "not_allowed") {
      return failWithDefault("FORBIDDEN");
    }

    if (outcome.status === "failed") {
      return failWithDefault("UNAVAILABLE");
    }

    const profile = await findOwnProfile(
      context.viewer.userId,
      context.viewer.isGuest,
      context.viewer.roles,
    );

    return profile ? ok(profile) : failWithDefault("UNAVAILABLE");
  },
});

/**
 * Everything held about the caller, as one document.
 *
 * Scoped by the database to whoever is asking, so it cannot be pointed at
 * anyone else, and rate-limited because assembling it is not free.
 */
export const exportMyAccountData = defineAction({
  name: "profiles.exportMyData",
  access: "viewer",
  input: z.object({}).strict(),
  rateLimit: rateLimitRules.exportPerUser,
  handler: async () => {
    const data = await exportMyData();
    return data ? ok(data) : failWithDefault("UNAVAILABLE");
  },
});

/**
 * Deletes the caller's account.
 *
 * A registered account must have authenticated recently; the database
 * enforces that, and says so plainly when it has not.
 */
export const deleteAccount = defineAction({
  name: "profiles.deleteAccount",
  access: "viewer",
  input: z.object({ confirm: z.literal("DELETE") }).strict(),
  rateLimit: rateLimitRules.exportPerUser,
  handler: async ({ confirm }) => {
    const outcome = await deleteMyAccount(confirm);

    if (outcome.status === "reauthenticate") {
      return fail(
        "FORBIDDEN",
        "For your safety, sign in again before deleting your account.",
      );
    }

    if (outcome.status === "failed") {
      return failWithDefault("UNAVAILABLE");
    }

    return ok({ deleted: true, removed: outcome.removed });
  },
});

/** For server components that need the viewer without going through an action. */
export async function readViewer() {
  return getViewer();
}

export async function readMyProfile(): Promise<Profile | null> {
  const viewer = await getViewer();

  if (!viewer) {
    return null;
  }

  return findOwnProfile(viewer.userId, viewer.isGuest, viewer.roles);
}
