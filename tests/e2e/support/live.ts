/**
 * Live-service test governor (Playwright side).
 *
 * Default-deny: live tests do not run unless the Supabase URL and anon key are
 * present, and write-dependent tests additionally require VSHARES_LIVE_WRITES
 * to be the exact string "true".
 *
 * IMPORTANT, and stated honestly: the describe-level gates below are the
 * authoritative control — they stop a write test (and its before/after hooks)
 * from running at all. The read-only request monitor (enforceReadOnly) is a
 * second, best-effort net that fails a read-only test if the BROWSER issues a
 * mutating request or invokes a Next.js server action. It cannot observe a
 * write performed server-side while rendering a GET, so it is NOT proof that no
 * write can occur; it is a tripwire. Tests whose page render writes server-side
 * (anything that starts a feed session, completes, saves, submits, reports or
 * authenticates) are classified WRITE_REQUIRED and gated, never relied upon to
 * be caught here.
 */
import { expect, type TestType } from "@playwright/test";
import { areWritesAuthorised, isLiveConfigured, isMutatingMethod, parseWritesEnabled } from "./governor";

// Playwright's concrete test type varies by fixtures; the helpers only use
// skip/beforeEach/afterEach, so accept any test instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTest = TestType<any, any>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const LIVE_CONFIGURED = isLiveConfigured({ url, anonKey });
export const LIVE_WRITES_ENABLED = parseWritesEnabled(process.env.VSHARES_LIVE_WRITES);
export const LIVE_WRITES_AUTHORISED = areWritesAuthorised({
  url,
  anonKey,
  writesFlag: process.env.VSHARES_LIVE_WRITES,
});

export const SUPABASE_HOST: string | null = (() => {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
})();

/**
 * Gate a describe block of READ-ONLY live tests. Skips the whole block (and its
 * hooks) unless the live service is configured. Call at the top of the block.
 */
export function requireLive(test: AnyTest): void {
  test.skip(!LIVE_CONFIGURED, "No live Supabase configured for this run.");
}

/**
 * Gate a describe block of WRITE-dependent live tests. Skips the whole block
 * (and its hooks, so no setup or teardown runs) unless the service is
 * configured AND writes are explicitly authorised with VSHARES_LIVE_WRITES=true.
 */
export function requireLiveWrites(test: AnyTest): void {
  test.skip(!LIVE_CONFIGURED, "No live Supabase configured for this run.");
  test.skip(
    !LIVE_WRITES_ENABLED,
    'Write-enabled live testing is not authorised. Set VSHARES_LIVE_WRITES=true (exact value) to request it.',
  );
}

// Tests run serially within a worker, so a module-level buffer reset in
// beforeEach is safe (each worker is its own process).
let readOnlyViolations: string[] = [];

/**
 * Tripwire for a read-only describe block: fails the test if the browser makes
 * a mutating request to Supabase or invokes a server action. Register with
 * enforceReadOnly(test) at the top of the block, after requireLive(test).
 */
export function enforceReadOnly(test: AnyTest): void {
  test.beforeEach(({ page }: { page: import("@playwright/test").Page }) => {
    readOnlyViolations = [];
    page.on("request", (request) => {
      const method = request.method().toUpperCase();
      const toSupabase = SUPABASE_HOST ? request.url().includes(SUPABASE_HOST) : false;
      const isServerAction = request.headers()["next-action"] !== undefined;

      if ((toSupabase && isMutatingMethod(method)) || isServerAction) {
        let where = request.url();
        try {
          const parsed = new URL(request.url());
          where = `${parsed.host}${parsed.pathname}`; // never the query string
        } catch {
          // keep the raw URL if it will not parse
        }
        readOnlyViolations.push(`${method} ${where}`);
      }
    });
  });

  test.afterEach(() => {
    const seen = readOnlyViolations;
    readOnlyViolations = [];
    expect(
      seen,
      `read-only live test issued mutating request(s): ${seen.join(" ; ")}`,
    ).toEqual([]);
  });
}
