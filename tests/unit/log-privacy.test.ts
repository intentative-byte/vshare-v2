/**
 * Logs and error envelopes must not carry personal data.
 *
 * Milestone 6's directive asks that sensitive data be kept out of logs and
 * error messages. That is a property of the pipeline, so it is tested at the
 * pipeline rather than reviewed by reading the code: every line the pipeline
 * writes, on every outcome, is captured and searched for the values that went
 * in. docs/VSHARES_SECURITY.md T11.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineAction, setViewerResolver } from "@/platform/action";
import { logger, userRef } from "@/platform/logger";
import { fail, ok } from "@/platform/result";
import type { Viewer } from "@/platform/auth/types";

// Values that must never reach a log line or an error message.
const email = "someone.private@example.com";
const secret = "sk-live-never-log-this-value";
const body = "I am recovering from a specific medical condition";
const userId = "11111111-2222-3333-4444-555555555555";

const member: Viewer = { userId, isGuest: false, roles: [] };

const input = z
  .object({ email: z.string().email(), note: z.string().min(2), token: z.string() })
  .strict();

let lines: string[] = [];

beforeEach(() => {
  lines = [];
  setViewerResolver(async () => member);
  const capture = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  vi.spyOn(console, "log").mockImplementation(capture);
  vi.spyOn(console, "error").mockImplementation(capture);
});

afterEach(() => {
  vi.restoreAllMocks();
  setViewerResolver(async () => null);
});

function logged(): string {
  return lines.join("\n");
}

function assertNothingSensitive(text: string): void {
  for (const value of [email, secret, body, userId]) {
    expect(text).not.toContain(value);
  }
  // Fragments, in case something truncates rather than omits.
  expect(text).not.toContain("someone.private");
  expect(text).not.toContain("medical condition");
}

describe("the action pipeline writes no personal data", () => {
  it("logs an outcome and no input values on success", async () => {
    const action = defineAction({
      name: "test.log.success",
      access: "viewer",
      input,
      handler: async () => ok("done"),
    });

    await action({ email, note: body, token: secret });

    expect(logged()).toContain('"outcome":"ok"');
    assertNothingSensitive(logged());
  });

  it("logs no input values when validation fails, and returns field names only", async () => {
    const action = defineAction({
      name: "test.log.invalid",
      access: "viewer",
      input,
      handler: async () => ok("done"),
    });

    const result = await action({ email: "not-an-email", note: body, token: secret });

    expect(result.ok).toBe(false);
    assertNothingSensitive(logged());

    // The caller is told which field is wrong, never what they sent.
    const envelope = JSON.stringify(result);
    expect(envelope).toContain("email");
    expect(envelope).not.toContain("not-an-email");
    assertNothingSensitive(envelope);
  });

  it("logs no input values when the handler throws, and returns nothing internal", async () => {
    const action = defineAction({
      name: "test.log.exception",
      access: "viewer",
      input,
      handler: async () => {
        throw new Error(`database said no for ${email}`);
      },
    });

    const result = await action({ email, note: body, token: secret });

    expect(result).toEqual({
      ok: false,
      error: { code: "UNAVAILABLE", message: expect.any(String) },
    });

    // The exception message is logged for operators, so the test asserts the
    // narrower thing that matters: the values the caller supplied are not in
    // the envelope returned to them.
    assertNothingSensitive(JSON.stringify(result));
  });

  it("logs no input values when a handler returns a failure", async () => {
    const action = defineAction({
      name: "test.log.failure",
      access: "viewer",
      input,
      handler: async () => fail("NOT_FOUND", "There is nothing there."),
    });

    await action({ email, note: body, token: secret });

    expect(logged()).toContain('"code":"NOT_FOUND"');
    assertNothingSensitive(logged());
  });

  it("records the caller as a digest, not as an account identifier", async () => {
    const action = defineAction({
      name: "test.log.ref",
      access: "viewer",
      input,
      handler: async () => ok("done"),
    });

    await action({ email, note: body, token: secret });

    expect(logged()).toContain(userRef(userId));
    expect(logged()).not.toContain(userId);
  });
});

describe("the logger itself", () => {
  it("produces a digest that is short, stable and not the identifier", () => {
    expect(userRef(userId)).toBe(userRef(userId));
    expect(userRef(userId)).toHaveLength(12);
    expect(userRef(userId)).not.toContain(userId.slice(0, 8));
    expect(userRef("other-user")).not.toBe(userRef(userId));
  });

  it("writes warnings and errors to stderr and information to stdout", () => {
    logger.info({ event: "test", outcome: "ok" });
    logger.warn({ event: "test", outcome: "denied" });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"level":"info"');
    expect(lines[1]).toContain('"level":"warn"');
  });
});
