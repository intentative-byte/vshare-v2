import "server-only";

import { createRequestClient } from "@/platform/db/server";
import type { Profile } from "./types";

/**
 * Every database statement for this module. Row-level security applies to
 * all of them: the request client acts as the viewer, so a query that tried
 * to reach another account's row would simply return nothing.
 */

type ProfileRow = {
  user_id: string;
  handle: string;
  display_name: string | null;
  is_public: boolean;
  locale: string;
  timezone: string;
  created_at: string;
};

function toProfile(row: ProfileRow, isGuest: boolean, roles: Profile["roles"]): Profile {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    isPublic: row.is_public,
    locale: row.locale,
    timezone: row.timezone,
    createdAt: row.created_at,
    isGuest,
    roles,
  };
}

export async function findOwnProfile(
  userId: string,
  isGuest: boolean,
  roles: Profile["roles"],
): Promise<Profile | null> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, handle, display_name, is_public, locale, timezone, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toProfile(data as ProfileRow, isGuest, roles);
}

export type UpdateProfileFields = {
  handle?: string;
  display_name?: string | null;
  is_public?: boolean;
};

export type UpdateOutcome =
  | { status: "ok"; profile: ProfileRow }
  | { status: "handle_taken" }
  | { status: "not_allowed" }
  | { status: "failed" };

export async function updateOwnProfile(
  userId: string,
  fields: UpdateProfileFields,
): Promise<UpdateOutcome> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("user_id", userId)
    .select("user_id, handle, display_name, is_public, locale, timezone, created_at")
    .maybeSingle();

  if (error) {
    // 23505 unique violation: the handle belongs to someone else.
    if (error.code === "23505") {
      return { status: "handle_taken" };
    }

    return { status: "failed" };
  }

  // No row came back although the account exists: a policy refused the
  // change, which is how a guest trying to go public is stopped.
  if (!data) {
    return { status: "not_allowed" };
  }

  return { status: "ok", profile: data as ProfileRow };
}

/** Records that a guest's owner turned out to already have an account. */
export async function recordMerge(guestUserId: string, targetUserId: string): Promise<boolean> {
  const supabase = await createRequestClient();

  const { error } = await supabase.rpc("merge_guest_into", {
    p_guest_id: guestUserId,
    p_target_id: targetUserId,
  });

  return !error;
}

/** Everything held about the caller, assembled by the database. */
export async function exportMyData(): Promise<Record<string, unknown> | null> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("export_my_data");

  return error ? null : (data as Record<string, unknown>);
}

export type DeletionOutcome =
  | { status: "deleted"; removed: Record<string, unknown> }
  | { status: "reauthenticate" }
  | { status: "failed" };

export async function deleteMyAccount(confirm: string): Promise<DeletionOutcome> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("delete_my_account", { p_confirm: confirm });

  if (error) {
    // The database refuses a destructive action on a session that has not
    // proved who it belongs to recently.
    if (error.message.includes("sign in again")) {
      return { status: "reauthenticate" };
    }

    return { status: "failed" };
  }

  return {
    status: "deleted",
    removed: (data as { removed: Record<string, unknown> }).removed,
  };
}

export { toProfile };
