import { describe, expect, it } from "vitest";
import { defaultRedirectPath, safeNextPath } from "@/platform/auth/redirect";

describe("safeNextPath", () => {
  it("keeps a same-site absolute path", () => {
    expect(safeNextPath("/explore")).toBe("/explore");
    expect(safeNextPath("/explore/personal-finance")).toBe("/explore/personal-finance");
  });

  it("keeps a query string and fragment", () => {
    expect(safeNextPath("/learn?topic=sleep")).toBe("/learn?topic=sleep");
    expect(safeNextPath("/you#progress")).toBe("/you#progress");
  });

  it("falls back when there is no value", () => {
    expect(safeNextPath(null)).toBe(defaultRedirectPath);
    expect(safeNextPath(undefined)).toBe(defaultRedirectPath);
    expect(safeNextPath("")).toBe(defaultRedirectPath);
  });

  it.each([
    ["an absolute URL", "https://evil.example/path"],
    ["a scheme-relative URL", "//evil.example/path"],
    ["a javascript URL", "javascript:alert(1)"],
    ["a data URL", "data:text/html,<script>alert(1)</script>"],
    ["a backslash authority", "/\\evil.example"],
    ["a double backslash", "\\\\evil.example"],
    ["an encoded backslash", "/%5cevil.example"],
    ["an embedded newline", "/learn\nSet-Cookie: x=1"],
    ["an encoded newline", "/learn%0aSet-Cookie:%20x=1"],
    ["a tab", "/learn\tx"],
    ["a relative path", "learn"],
    ["an embedded scheme", "/redirect?to=https://evil.example"],
  ])("rejects %s", (_label, value) => {
    const result = safeNextPath(value);

    if (value === "/redirect?to=https://evil.example") {
      // Contains "://" anywhere, so it is refused rather than normalised.
      expect(result).toBe(defaultRedirectPath);
      return;
    }

    expect(result).toBe(defaultRedirectPath);
  });

  it("never resolves to another origin", () => {
    const origin = "https://vshares.example";
    const candidates = [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\/evil.example",
      "/%5c%5cevil.example",
    ];

    for (const candidate of candidates) {
      const resolved = new URL(safeNextPath(candidate), origin);
      expect(resolved.origin).toBe(origin);
    }
  });

  it("accepts a caller-supplied fallback", () => {
    expect(safeNextPath("https://evil.example", "/path")).toBe("/path");
  });
});
