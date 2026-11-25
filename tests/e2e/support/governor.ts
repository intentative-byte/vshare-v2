/**
 * Pure, framework-free governor logic for live-service tests.
 *
 * Kept free of any Playwright import so it can be unit-tested directly
 * (tests/unit/live-governor.test.ts) with no browser and no network.
 *
 * The rules this encodes:
 *  - A run is "live-configured" only when BOTH the Supabase URL and the
 *    anonymous key are present. Missing either → read-only live tests skip and
 *    write tests skip; nothing can reach the database.
 *  - Write-enabled execution requires the EXACT string "true". Every other
 *    value — "1", "yes", "TRUE", " true ", "" or unset — is read-only. This is
 *    deliberately strict so an ambiguous or accidental value never enables
 *    remote writes.
 */

/** HTTP methods that can mutate server state. */
export const MUTATING_METHODS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

/** True only for the exact value "true". Rejects "1", "yes", "TRUE", "", etc. */
export function parseWritesEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** A run can reach the live database only with both the URL and the anon key. */
export function isLiveConfigured(env: { url?: string | null; anonKey?: string | null }): boolean {
  return Boolean(env.url && env.anonKey);
}

/**
 * Whether write-dependent live tests may run. Requires live configuration AND
 * the exact opt-in. Missing credentials can never enable writes, whatever
 * VSHARES_LIVE_WRITES says.
 */
export function areWritesAuthorised(input: {
  url?: string | null;
  anonKey?: string | null;
  writesFlag: string | undefined;
}): boolean {
  return isLiveConfigured(input) && parseWritesEnabled(input.writesFlag);
}
