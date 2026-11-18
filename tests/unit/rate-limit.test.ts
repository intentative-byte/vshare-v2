import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryRateLimitStore,
  checkRateLimit,
  decide,
  rateLimitRules,
  windowStartFor,
} from "@/platform/rate-limit";

const store = new MemoryRateLimitStore();
const rule = { limit: 3, windowSeconds: 60 };

beforeEach(() => {
  store.clear();
});

describe("windowStartFor", () => {
  it("snaps to the start of the containing window", () => {
    expect(windowStartFor(1_000_000_000_000, 60)).toBe(999_999_960);
    expect(windowStartFor(1_000_000_059_999, 60)).toBe(1_000_000_020);
  });
});

describe("decide", () => {
  it("allows up to the limit and reports what is left", () => {
    const windowStart = 1_000;

    expect(decide({ windowStart, count: 1 }, rule, 1_000_000)).toMatchObject({
      allowed: true,
      remaining: 2,
      retryAfterSeconds: 0,
    });
    expect(decide({ windowStart, count: 3 }, rule, 1_000_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("refuses past the limit and says when to retry", () => {
    const decision = decide({ windowStart: 1_000, count: 4 }, rule, 1_030_000);

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(30);
  });

  it("never reports a retry of zero when refusing", () => {
    const decision = decide({ windowStart: 1_000, count: 9 }, rule, 1_060_000);

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkRateLimit", () => {
  it("counts attempts per subject", async () => {
    const nowMs = 1_700_000_000_000;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const decision = await checkRateLimit("test", "user-a", rule, { store, nowMs });
      expect(decision.allowed, `attempt ${attempt}`).toBe(true);
    }

    const refused = await checkRateLimit("test", "user-a", rule, { store, nowMs });
    expect(refused.allowed).toBe(false);
  });

  it("keeps subjects independent", async () => {
    const nowMs = 1_700_000_000_000;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await checkRateLimit("test", "user-a", rule, { store, nowMs });
    }

    const other = await checkRateLimit("test", "user-b", rule, { store, nowMs });
    expect(other.allowed).toBe(true);
  });

  it("keeps buckets independent", async () => {
    const nowMs = 1_700_000_000_000;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await checkRateLimit("bucket-one", "user-a", rule, { store, nowMs });
    }

    const other = await checkRateLimit("bucket-two", "user-a", rule, { store, nowMs });
    expect(other.allowed).toBe(true);
  });

  it("resets in the next window", async () => {
    const nowMs = 1_700_000_000_000;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await checkRateLimit("test", "user-a", rule, { store, nowMs });
    }

    const later = await checkRateLimit("test", "user-a", rule, { store, nowMs: nowMs + 61_000 });
    expect(later.allowed).toBe(true);
    expect(later.remaining).toBe(2);
  });
});

describe("named rules", () => {
  it("are all positive and bounded", () => {
    for (const [name, value] of Object.entries(rateLimitRules)) {
      expect(value.limit, name).toBeGreaterThan(0);
      expect(value.windowSeconds, name).toBeGreaterThan(0);
      expect(value.windowSeconds, name).toBeLessThanOrEqual(24 * 60 * 60);
    }
  });
});
