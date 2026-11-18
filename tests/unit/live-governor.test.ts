import { describe, expect, it } from "vitest";
import {
  areWritesAuthorised,
  isLiveConfigured,
  isMutatingMethod,
  parseWritesEnabled,
} from "../e2e/support/governor";

/**
 * Proves the live-test safety governor without any browser or network
 * (directive Phase D.8). The governor is default-deny: writes need the exact
 * opt-in, and missing credentials can never enable them.
 */

describe("parseWritesEnabled — only the exact string 'true' opts in", () => {
  it("accepts exactly 'true'", () => {
    expect(parseWritesEnabled("true")).toBe(true);
  });

  it("rejects every ambiguous or near value", () => {
    for (const value of ["1", "yes", "TRUE", "True", " true", "true ", "false", "0", "", "y", "on"]) {
      expect(parseWritesEnabled(value), `value: ${JSON.stringify(value)}`).toBe(false);
    }
  });

  it("rejects an unset variable", () => {
    expect(parseWritesEnabled(undefined)).toBe(false);
  });
});

describe("isLiveConfigured — needs both the URL and the anon key", () => {
  it("is true only when both are present", () => {
    expect(isLiveConfigured({ url: "https://x.supabase.co", anonKey: "anon" })).toBe(true);
  });

  it("is false when either is missing or empty", () => {
    expect(isLiveConfigured({ url: "https://x.supabase.co", anonKey: "" })).toBe(false);
    expect(isLiveConfigured({ url: "", anonKey: "anon" })).toBe(false);
    expect(isLiveConfigured({ url: undefined, anonKey: "anon" })).toBe(false);
    expect(isLiveConfigured({ url: "https://x.supabase.co", anonKey: null })).toBe(false);
    expect(isLiveConfigured({})).toBe(false);
  });
});

describe("areWritesAuthorised — default-deny, and credentials gate the opt-in", () => {
  const creds = { url: "https://x.supabase.co", anonKey: "anon" };

  it("defaults to false when no flag is set, even fully configured", () => {
    expect(areWritesAuthorised({ ...creds, writesFlag: undefined })).toBe(false);
  });

  it("is true only with full config AND the exact flag", () => {
    expect(areWritesAuthorised({ ...creds, writesFlag: "true" })).toBe(true);
  });

  it("is false for an ambiguous flag even when configured", () => {
    for (const value of ["1", "yes", "TRUE", ""]) {
      expect(areWritesAuthorised({ ...creds, writesFlag: value }), value).toBe(false);
    }
  });

  it("missing credentials never enable writes, whatever the flag says", () => {
    expect(areWritesAuthorised({ url: "", anonKey: "", writesFlag: "true" })).toBe(false);
    expect(areWritesAuthorised({ url: "https://x.supabase.co", anonKey: undefined, writesFlag: "true" })).toBe(
      false,
    );
  });
});

describe("isMutatingMethod — catches state-changing HTTP methods", () => {
  it("flags mutating methods, case-insensitively", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "post", "Delete"]) {
      expect(isMutatingMethod(method), method).toBe(true);
    }
  });

  it("does not flag safe methods", () => {
    for (const method of ["GET", "HEAD", "OPTIONS", "get"]) {
      expect(isMutatingMethod(method), method).toBe(false);
    }
  });
});
