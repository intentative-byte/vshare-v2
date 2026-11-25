import { describe, expect, it } from "vitest";
import { handleSchema, signInInput, updateProfileInput } from "@/modules/profiles/schemas";
import { updatePreferencesInput } from "@/modules/personalisation/schemas";
import {
  resubmitInput,
  sourceUrlSchema,
  submitResourceInput,
} from "@/modules/content/schemas";

describe("handle validation", () => {
  it("accepts a well-formed handle and normalises case", () => {
    expect(handleSchema.parse("Ada_99")).toBe("ada_99");
    expect(handleSchema.parse("  spaced  ")).toBe("spaced");
  });

  it.each([
    ["too short", "ab"],
    ["too long", "a".repeat(25)],
    ["a space inside", "two words"],
    ["punctuation", "ada.lovelace"],
    ["a hyphen", "ada-lovelace"],
    ["an empty value", ""],
    ["an emoji", "ada😀"],
  ])("rejects %s", (_label, value) => {
    expect(handleSchema.safeParse(value).success).toBe(false);
  });
});

describe("profile update", () => {
  it("accepts a partial change", () => {
    expect(updateProfileInput.parse({ displayName: "Ada" })).toEqual({ displayName: "Ada" });
    expect(updateProfileInput.parse({ isPublic: true })).toEqual({ isPublic: true });
  });

  it("allows clearing the display name but not blanking it with spaces", () => {
    expect(updateProfileInput.parse({ displayName: null })).toEqual({ displayName: null });
    expect(updateProfileInput.safeParse({ displayName: "   " }).success).toBe(false);
  });

  it("rejects an empty change", () => {
    expect(updateProfileInput.safeParse({}).success).toBe(false);
  });

  it("rejects fields that are not ours to set", () => {
    expect(updateProfileInput.safeParse({ displayName: "Ada", userId: "x" }).success).toBe(false);
    expect(updateProfileInput.safeParse({ displayName: "Ada", roles: ["admin"] }).success).toBe(false);
    expect(updateProfileInput.safeParse({ createdAt: "2020-01-01" }).success).toBe(false);
  });
});

describe("sign-in input", () => {
  it("normalises the address", () => {
    expect(signInInput.parse({ email: "  Ada@Example.COM " }).email).toBe("ada@example.com");
  });

  it.each([["not an email", "ada"], ["no domain", "ada@"], ["empty", ""]])(
    "rejects %s",
    (_label, email) => {
      expect(signInInput.safeParse({ email }).success).toBe(false);
    },
  );

  it("rejects an over-long address", () => {
    expect(signInInput.safeParse({ email: `${"a".repeat(250)}@example.com` }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(signInInput.safeParse({ email: "ada@example.com", role: "admin" }).success).toBe(false);
  });
});

describe("preferences update", () => {
  it("accepts values inside the allowed range", () => {
    expect(updatePreferencesInput.parse({ sessionMinutes: 20 })).toEqual({ sessionMinutes: 20 });
    expect(updatePreferencesInput.parse({ personalisationEnabled: false })).toEqual({
      personalisationEnabled: false,
    });
  });

  it("rejects values outside it, matching the database constraint", () => {
    expect(updatePreferencesInput.safeParse({ sessionMinutes: 4 }).success).toBe(false);
    expect(updatePreferencesInput.safeParse({ sessionMinutes: 61 }).success).toBe(false);
    expect(updatePreferencesInput.safeParse({ sessionMinutes: 12.5 }).success).toBe(false);
  });

  it("rejects an unknown consent value", () => {
    expect(updatePreferencesInput.safeParse({ analyticsConsent: "maybe" }).success).toBe(false);
  });

  it("rejects an empty change", () => {
    expect(updatePreferencesInput.safeParse({}).success).toBe(false);
  });
});

describe("submission validation", () => {
  it("accepts a well-formed submission", () => {
    const valid = {
      sourceUrl: "https://example.com/a-useful-page",
      sourceName: "Example Publisher",
      title: "Something genuinely useful",
      summary: "A summary long enough to satisfy the minimum length rule applied on the server.",
      takeaways: ["Something worth remembering from it."],
      nextStep: "Try the first suggestion this week.",
      topicId: "11111111-1111-4111-8111-111111111111",
      format: "article" as const,
      level: "beginner" as const,
      estimatedMinutes: 10,
    };

    expect(submitResourceInput.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["an http address", "http://example.com/page"],
    ["a loopback address", "https://localhost/page"],
    ["a private range", "https://192.168.0.5/page"],
    ["another private range", "https://10.1.2.3/page"],
    ["the carrier range", "https://172.16.0.1/page"],
    ["a bare IP address", "https://93.184.216.34/page"],
    ["a link-local address", "https://169.254.1.1/page"],
    ["a hostname with no dot", "https://intranet/page"],
    ["a .local name", "https://printer.local/page"],
    ["not a URL at all", "example dot com"],
  ])("refuses %s as a source", (_label, sourceUrl) => {
    expect(sourceUrlSchema.safeParse(sourceUrl).success).toBe(false);
  });

  it("refuses a submission that smuggles in a status", () => {
    expect(
      submitResourceInput.safeParse({
        sourceUrl: "https://example.com/a",
        sourceName: "Example",
        title: "A title long enough",
        summary: "A summary long enough to satisfy the minimum length rule applied on the server.",
        takeaways: ["Something worth remembering."],
        nextStep: "Try it this week.",
        topicId: "11111111-1111-4111-8111-111111111111",
        format: "article",
        level: "beginner",
        estimatedMinutes: 10,
        status: "published",
      }).success,
    ).toBe(false);
  });

  it("holds takeaways to between one and three, each saying something", () => {
    const base = {
      sourceUrl: "https://example.com/a",
      sourceName: "Example",
      title: "A title long enough",
      summary: "A summary long enough to satisfy the minimum length rule applied on the server.",
      nextStep: "Try it this week.",
      topicId: "11111111-1111-4111-8111-111111111111",
      format: "article" as const,
      level: "beginner" as const,
      estimatedMinutes: 10,
    };

    expect(submitResourceInput.safeParse({ ...base, takeaways: [] }).success).toBe(false);
    expect(submitResourceInput.safeParse({ ...base, takeaways: ["too short"] }).success).toBe(false);
    expect(
      submitResourceInput.safeParse({ ...base, takeaways: ["a", "b", "c", "d"].map((x) => x.repeat(20)) })
        .success,
    ).toBe(false);
  });
});

describe("resubmission validation", () => {
  it("requires the submission it corrects", () => {
    expect(
      resubmitInput.safeParse({
        title: "A corrected title here",
        summary: "A corrected summary long enough to satisfy the minimum length rule applied.",
        takeaways: ["A corrected takeaway."],
        nextStep: "Try the corrected thing.",
        sourceName: "Example",
      }).success,
    ).toBe(false);
  });

  it("rejects a status smuggled alongside a correction", () => {
    expect(
      resubmitInput.safeParse({
        contentId: "11111111-1111-4111-8111-111111111111",
        title: "A corrected title here",
        summary: "A corrected summary long enough to satisfy the minimum length rule applied.",
        takeaways: ["A corrected takeaway."],
        nextStep: "Try the corrected thing.",
        sourceName: "Example",
        status: "published",
      }).success,
    ).toBe(false);
  });
});
