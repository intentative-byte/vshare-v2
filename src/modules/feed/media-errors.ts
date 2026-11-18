/**
 * Pure classification of the database error that means content_media does not
 * exist yet (migration 9 not applied), so the feed can fall back to cards-only.
 * Kept free of any database import so it is unit-tested directly.
 */
export function isMissingMediaTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "42P01" || code === "PGRST205" || code === "PGRST200") return true;
  return /content_media/i.test(message) && /(does not exist|could not find the table|schema cache)/i.test(message);
}

export type MediaReadError = { code?: string; message?: string } | null | undefined;
export type MediaErrorCategory = "missing_schema" | "permission_denied" | "connection" | "other";

/**
 * Classify a media-read error so the caller can decide whether it is the
 * expected "schema not applied yet" case (silent) or an unexpected failure
 * worth a safe, structured warning. Classification uses only error codes and
 * generic message shapes — never credentials or personal data.
 */
export function classifyMediaReadError(error: MediaReadError): MediaErrorCategory {
  if (!error) return "other";
  if (isMissingMediaTableError(error)) return "missing_schema";
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "42501" || code === "401" || code === "403" || /permission denied|not authorized|insufficient/i.test(message)) {
    return "permission_denied";
  }
  if (code.startsWith("08") || /econnrefused|connection|fetch failed|network|timeout|unreachable/i.test(message)) {
    return "connection";
  }
  return "other";
}

export interface MediaReadResult<T> {
  rows: T[];
  /** Null when there is nothing worth logging (success or the expected missing-schema case). */
  logCategory: MediaErrorCategory | null;
}

/**
 * Pure handling of a media read: an empty success and the expected missing-schema
 * error both yield an empty feed with no log; any other error yields an empty
 * feed and a category to log. The public feed stays usable in every case.
 */
export function handleMediaReadResult<T>(result: { data: T[] | null; error: MediaReadError }): MediaReadResult<T> {
  if (result.error) {
    const category = classifyMediaReadError(result.error);
    return { rows: [], logCategory: category === "missing_schema" ? null : category };
  }
  return { rows: result.data ?? [], logCategory: null };
}
