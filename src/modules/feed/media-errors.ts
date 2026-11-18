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
