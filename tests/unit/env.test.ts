import { describe, expect, it } from "vitest";
import { parseEnv } from "@/platform/env";

describe("environment validation", () => {
  it("applies defaults when nothing is set", () => {
    const env = parseEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });

  it("treats an empty variable as absent rather than as a value", () => {
    const env = parseEnv({ NEXT_PUBLIC_SITE_URL: "", NEXT_PUBLIC_SUPABASE_URL: "   " });

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });

  it("rejects a malformed site URL instead of guessing", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: "not-a-url" })).toThrowError(
      /Invalid environment configuration/,
    );
  });

  it("rejects a malformed database URL", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SUPABASE_URL: "localhost:54321" })).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects an implausibly short key", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "short" })).toThrowError(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseEnv({ NODE_ENV: "staging" })).toThrowError(/NODE_ENV/);
  });

  it("names every offending variable in one message", () => {
    try {
      parseEnv({ NEXT_PUBLIC_SITE_URL: "nope", NEXT_PUBLIC_SUPABASE_URL: "also-nope" });
      expect.unreachable("expected validation to fail");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("NEXT_PUBLIC_SITE_URL");
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    }
  });

  it("reads boolean-ish switches", () => {
    expect(parseEnv({ DEV_TOOLS_ENABLED: "true" }).DEV_TOOLS_ENABLED).toBe(true);
    expect(parseEnv({ DEV_TOOLS_ENABLED: "0" }).DEV_TOOLS_ENABLED).toBe(false);
  });
});
