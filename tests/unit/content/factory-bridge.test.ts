import { describe, expect, it } from "vitest";
import { toCreateCardInput } from "@/modules/content/factory-bridge";
import type {
  FactoryCard,
  RubricAxis,
  RubricResult,
  RubricScores,
  VerificationStatus,
} from "@/factory/types";

const UUID = "11111111-1111-4111-8111-111111111111";

const AXES: RubricAxis[] = [
  "accuracy",
  "sourceReliability",
  "usefulness",
  "clarity",
  "practicalApplication",
  "originality",
  "safety",
  "freshness",
];

function rubric(composite: number, verdict: RubricResult["verdict"]): RubricResult {
  const scores = Object.fromEntries(AXES.map((a) => [a, 4])) as RubricScores;
  const reasons = Object.fromEntries(AXES.map((a) => [a, "ok"])) as Record<RubricAxis, string>;
  return { scores, reasons, composite, floorBreaches: [], verdict };
}

function makeCard(over: Partial<FactoryCard> = {}): FactoryCard {
  return {
    slug: "a-valid-finance-slug",
    category: "Personal finance",
    topic: "personal-finance",
    level: "beginner",
    format: "article",
    objective: "Help the reader write a first budget.",
    title: "A clear, valid card title",
    summary:
      "A summary comfortably longer than the forty-character minimum the database applies to every card version here.",
    takeaways: ["Write down every fixed cost first."],
    nextStep: "List your three biggest monthly costs today.",
    estimatedMinutes: 8,
    source: { url: "https://example.com/budget", publisher: "Example Publisher" },
    isAiAssisted: true,
    evidence: {
      source: { url: "https://example.com/budget", publisher: "Example Publisher" },
      sourceVerdict: { ok: true, reasons: [], sourceClass: "institution" },
      claims: [],
      overall: "verified" as VerificationStatus,
    },
    quality: rubric(78, "queue"),
    safety: { isHighImpact: false, requiresSecondReviewer: false, disclaimers: [], riskNotes: [] },
    freshness: { reviewDueMonths: 12 },
    reviewStatus: "editorial_queue",
    requiresFactCheck: false,
    ...over,
  };
}

describe("toCreateCardInput — valid", () => {
  it("produces a valid, draft-only input", () => {
    const r = toCreateCardInput(makeCard(), UUID);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.input).not.toBeNull();
    expect(r.input!.topicId).toBe(UUID);
    expect(r.input!.isAiAssisted).toBe(true);
    expect(r.input!.qualityScore).toBe(78);
    expect(r.input!.sourceName).toBe("Example Publisher");
  });

  it("never carries a publication status or link-check field", () => {
    const r = toCreateCardInput(makeCard(), UUID);
    const keys = Object.keys(r.input!);
    for (const forbidden of ["status", "published", "publishedAt", "linkCheckedAt", "publicationEligible"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("preserves provenance and educational metadata not stored on the card row", () => {
    const r = toCreateCardInput(
      makeCard({
        source: {
          url: "https://example.com/budget",
          publisher: "Example Publisher",
          author: "A. Writer",
          retrievedAt: "2026-11-20T00:00:00Z",
          sourceDate: "2026-01-01",
        },
      }),
      UUID,
    );
    expect(r.provenance.author).toBe("A. Writer");
    expect(r.provenance.retrievedAt).toBe("2026-11-20T00:00:00Z");
    expect(r.input!.sourceAuthor).toBe("A. Writer");
    expect(r.objective).toMatch(/budget/);
  });

  it("preserves the high-impact flag and second-reviewer requirement", () => {
    const r = toCreateCardInput(
      makeCard({
        safety: { isHighImpact: true, requiresSecondReviewer: true, disclaimers: [], riskNotes: [] },
      }),
      UUID,
    );
    expect(r.isHighImpact).toBe(true);
    expect(r.requiresSecondReviewer).toBe(true);
  });
});

describe("toCreateCardInput — evidence and quality as advisory warnings", () => {
  it("warns (does not block) when evidence is not fully verified", () => {
    const r = toCreateCardInput(
      makeCard({
        evidence: {
          source: { url: "https://example.com/budget", publisher: "Example Publisher" },
          sourceVerdict: { ok: true, reasons: [], sourceClass: "community" },
          claims: [],
          overall: "not_verified",
        },
      }),
      UUID,
    );
    expect(r.ok).toBe(true);
    expect(r.evidenceStatus).toBe("not_verified");
    expect(r.warnings.join(" ")).toMatch(/evidence/);
  });

  it("warns (does not block) on a 'revise' rubric verdict", () => {
    const r = toCreateCardInput(makeCard({ quality: rubric(55, "revise") }), UUID);
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/revise/);
  });

  it("blocks a 'reject' rubric verdict even when the fields are schema-valid", () => {
    const r = toCreateCardInput(makeCard({ quality: rubric(20, "reject") }), UUID);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/reject/);
    // The fields themselves were valid, so the input is still available to inspect.
    expect(r.input).not.toBeNull();
  });
});

describe("toCreateCardInput — invalid and incomplete", () => {
  it("rejects a non-UUID topicId (never invents one)", () => {
    const r = toCreateCardInput(makeCard(), "not-a-uuid");
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/uuid|topic/i);
  });

  it("rejects a too-short title via the shared schema", () => {
    const r = toCreateCardInput(makeCard({ title: "short" }), UUID);
    expect(r.ok).toBe(false);
    expect(r.input).toBeNull();
    expect(r.issues.join(" ")).toMatch(/title/);
  });

  it("rejects an incomplete card with no takeaways", () => {
    const r = toCreateCardInput(makeCard({ takeaways: [] }), UUID);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/takeaway/i);
  });

  it("rejects a summary below the minimum length", () => {
    const r = toCreateCardInput(makeCard({ summary: "too short" }), UUID);
    expect(r.ok).toBe(false);
    expect(r.issues.join(" ")).toMatch(/summary/);
  });

  it("rejects a non-public / non-https source URL", () => {
    const r = toCreateCardInput(makeCard({ source: { url: "http://localhost/x", publisher: "X" } }), UUID);
    expect(r.ok).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});
