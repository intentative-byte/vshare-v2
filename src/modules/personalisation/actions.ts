"use server";

import { z } from "zod";
import { defineAction } from "@/platform/action";
import { failWithDefault, ok } from "@/platform/result";
import { getViewer } from "@/platform/auth/provider";
import { updatePreferencesInput } from "./schemas";
import { findOwnPreferences, updateOwnPreferences } from "./repository";
import type { Preferences } from "./types";

export const getMyPreferences = defineAction({
  name: "personalisation.getMyPreferences",
  access: "viewer",
  input: z.object({}).strict(),
  handler: async (_input, context) => {
    if (!context.viewer) {
      return failWithDefault("UNAUTHENTICATED");
    }

    const preferences = await findOwnPreferences(context.viewer.userId);
    return preferences ? ok(preferences) : failWithDefault("NOT_FOUND");
  },
});

export const updatePreferences = defineAction({
  name: "personalisation.updatePreferences",
  access: "viewer",
  input: updatePreferencesInput,
  rateLimit: { limit: 30, windowSeconds: 60 * 60 },
  handler: async (input, context) => {
    if (!context.viewer) {
      return failWithDefault("UNAUTHENTICATED");
    }

    const fields: Record<string, unknown> = {};

    if (input.personalisationEnabled !== undefined) {
      fields.personalisation_enabled = input.personalisationEnabled;
    }

    if (input.analyticsConsent !== undefined) {
      fields.analytics_consent = input.analyticsConsent;
    }

    if (input.sessionMinutes !== undefined) {
      fields.session_minutes = input.sessionMinutes;
    }

    const preferences = await updateOwnPreferences(context.viewer.userId, fields);
    return preferences ? ok(preferences) : failWithDefault("UNAVAILABLE");
  },
});

/** For server components. */
export async function readMyPreferences(): Promise<Preferences | null> {
  const viewer = await getViewer();
  return viewer ? findOwnPreferences(viewer.userId) : null;
}
