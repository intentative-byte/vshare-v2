import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineAction, setViewerResolver } from "@/platform/action";
import { MemoryRateLimitStore } from "@/platform/rate-limit";
import { ok } from "@/platform/result";
import type { Viewer } from "@/platform/auth/types";

const store = new MemoryRateLimitStore();

const guest: Viewer = { userId: "guest-1", isGuest: true, roles: [] };
const member: Viewer = { userId: "user-1", isGuest: false, roles: [] };
const moderator: Viewer = { userId: "mod-1", isGuest: false, roles: ["moderator"] };
const admin: Viewer = { userId: "admin-1", isGuest: false, roles: ["admin"] };

function signedInAs(viewer: Viewer | null) {
  setViewerResolver(async () => viewer);
}

const input = z.object({ value: z.string().min(2) }).strict();

beforeEach(() => {
  store.clear();
  signedInAs(null);
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("access control", () => {
  const handler = vi.fn(async () => ok("done"));

  function action(access: Parameters<typeof defineAction>[0]["access"]) {
    handler.mockClear();
    return defineAction({ name: `test.${access}`, access, input, handler });
  }

  it("lets anyone call a public action", async () => {
    const result = await action("public")({ value: "hi" });

    expect(result).toEqual({ ok: true, data: "done" });
  });

  it("refuses a signed-out caller on a viewer action", async () => {
    const result = await action("viewer")({ value: "hi" });

    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("lets a guest call a viewer action", async () => {
    signedInAs(guest);
    const result = await action("viewer")({ value: "hi" });

    expect(result.ok).toBe(true);
  });

  it("refuses a guest on an account action", async () => {
    signedInAs(guest);
    const result = await action("account")({ value: "hi" });

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("lets a registered account call an account action", async () => {
    signedInAs(member);
    const result = await action("account")({ value: "hi" });

    expect(result.ok).toBe(true);
  });

  it("refuses a registered account without the role", async () => {
    signedInAs(member);
    const result = await action("moderator")({ value: "hi" });

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("refuses a moderator on an admin action", async () => {
    signedInAs(moderator);
    const result = await action("admin")({ value: "hi" });

    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("lets the matching role through", async () => {
    signedInAs(moderator);
    expect((await action("moderator")({ value: "hi" })).ok).toBe(true);

    signedInAs(admin);
    expect((await action("admin")({ value: "hi" })).ok).toBe(true);
  });

  it("never treats a client-supplied identity as authentication", async () => {
    const result = await action("account")({ value: "hi", userId: admin.userId });

    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });
});

describe("validation", () => {
  it("rejects bad input with per-field messages", async () => {
    const run = defineAction({
      name: "test.validate",
      access: "public",
      input,
      handler: async () => ok("done"),
    });

    const result = await run({ value: "x" });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.fields?.value).toBeTruthy();
    }
  });

  it("rejects unknown fields", async () => {
    const run = defineAction({
      name: "test.strict",
      access: "public",
      input,
      handler: async () => ok("done"),
    });

    const result = await run({ value: "hello", isAdmin: true });

    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("checks access before input, so a denied caller learns nothing about the shape", async () => {
    const run = defineAction({
      name: "test.order",
      access: "admin",
      input,
      handler: async () => ok("done"),
    });

    const result = await run({ nonsense: true });

    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });
});

describe("rate limiting", () => {
  it("refuses past the limit and reports a retry delay", async () => {
    const run = defineAction({
      name: "test.limited",
      access: "public",
      input,
      rateLimit: { limit: 2, windowSeconds: 60 },
      handler: async () => ok("done"),
    });

    const hint = { clientRef: "client-a" };
    const dependencies = { rateLimitStore: store, nowMs: 1_700_000_000_000 };

    expect((await run({ value: "hi" }, hint, dependencies)).ok).toBe(true);
    expect((await run({ value: "hi" }, hint, dependencies)).ok).toBe(true);

    const refused = await run({ value: "hi" }, hint, dependencies);

    expect(refused.ok).toBe(false);

    if (!refused.ok) {
      expect(refused.error.code).toBe("RATE_LIMITED");
      expect(refused.error.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});

describe("failures", () => {
  it("turns an unexpected error into a safe response and leaks no detail", async () => {
    const run = defineAction({
      name: "test.throws",
      access: "public",
      input,
      handler: async () => {
        throw new Error("connection string postgres://user:secret@host/db failed");
      },
    });

    const result = await run({ value: "hi" });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("UNAVAILABLE");
      expect(result.error.message).not.toContain("postgres");
      expect(result.error.message).not.toContain("secret");
    }
  });
});
