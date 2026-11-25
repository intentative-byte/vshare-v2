import "server-only";

import { createRequestClient } from "@/platform/db/server";
import type { Preferences } from "./types";

type PreferencesRow = {
  user_id: string;
  personalisation_enabled: boolean;
  analytics_consent: "unset" | "granted" | "denied";
  session_minutes: number;
};

function toPreferences(row: PreferencesRow): Preferences {
  return {
    personalisationEnabled: row.personalisation_enabled,
    analyticsConsent: row.analytics_consent,
    sessionMinutes: row.session_minutes,
  };
}

export async function findOwnPreferences(userId: string): Promise<Preferences | null> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("preferences")
    .select("user_id, personalisation_enabled, analytics_consent, session_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toPreferences(data as PreferencesRow);
}

export async function updateOwnPreferences(
  userId: string,
  fields: Record<string, unknown>,
): Promise<Preferences | null> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("preferences")
    .update(fields)
    .eq("user_id", userId)
    .select("user_id, personalisation_enabled, analytics_consent, session_minutes")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toPreferences(data as PreferencesRow);
}
