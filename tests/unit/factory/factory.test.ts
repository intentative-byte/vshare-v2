import { describe, expect, it } from "vitest";
import {
  buildEvidence,
  classifySafety,
  detectDuplicate,
  runPipeline,
  verifySource,
  type DraftInput,
} from "@/factory";
import { DEMO_DRAFTS, DEMO_NOW } from "@/factory/fixtures";

const base: DraftInput = {
  slug: "a-good-enough-draft",
  category: "technology-and-ai",
  topic: "ai-foundations",
  level: "beginner",
  format: "article",
  objective: "Understand a thing.",
  title: "A clear and useful title here",
  summary:
    "A summary that is comfortably within the minimum and maximum length the database applies, so the draft is storable and the clarity axis is satisfied.",
  takeaways: ["The first genuine takeaway is well over twenty characters long.", "The second is also clearly long enough."],
  nextStep: "Write down one thing you learned and try it tomorrow.",
  estimatedMinutes: 10,
  source: { url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online", publisher: "NCSC" },
};

describe("source verification — invalid source rejection", () => {
  it("rejects a non-reputable / blocked host", () => {
    const v = verifySource({ url: "https://example.com/page", publisher: "Someone" });
    expect(v.ok).toBe(false);
  });
  it("rejects a non-https url", () => {
    expect(verifySource({ url: "http://www.nhs.uk/x", publisher: "NHS" }).ok).toBe(false);
  });
  it("accepts a recognised official publisher", () => {
    expect(verifySource({ url: "https://www.nhs.uk/live-well/", publisher: "NHS" }).ok).toBe(true);
  });
});

describe("evidence — missing evidence is never treated as verified", () => {
  it("marks a cited-but-unquoted claim as pending human fact-check, not verified", () => {
    const ev = buildEvidence(base);
    expect(ev.overall).toBe("cited_pending_verification");
    expect(ev.claims.every((c) => c.verdict === "cited_pending_verification")).toBe(true);
  });
  it("marks claims not_verified when the source is not reputable", () => {
    const ev = buildEvidence({ ...base, source: { url: "https://example.com/x", publisher: "x" } });
    expect(ev.overall).toBe("not_verified");
  });
  it("marks a claim verified only when a supporting quote is supplied", () => {
    const ev = buildEvidence({ ...base, takeaways: ["Two-factor blocks most stolen-password attacks."], supportingQuotes: ["Two-factor authentication blocks most attacks that start with a stolen password."] });
    expect(ev.claims[0]?.verdict).toBe("verified");
  });
});

describe("duplicate detection", () => {
  it("flags an exact/normalized source_url already in the catalogue", () => {
    const r = detectDuplicate(
      { url: "https://www.nhs.uk/page/?utm_source=x", title: "T" },
      [{ url: "https://www.nhs.uk/page", title: "T2" }],
    );
    expect(r.isDuplicate).toBe(true);
  });
  it("flags a near-duplicate title", () => {
    const r = detectDuplicate(
      { url: "https://www.nhs.uk/a", title: "What actually helps when you cannot sleep" },
      [{ url: "https://www.nhs.uk/b", title: "What actually helps when you cannot sleep tonight" }],
    );
    expect(r.isDuplicate).toBe(true);
  });
  it("passes a genuinely distinct card", () => {
    expect(detectDuplicate({ url: "https://www.gov.uk/x", title: "Totally different subject" }, [
      { url: "https://www.nhs.uk/y", title: "Sleep guidance" },
    ]).isDuplicate).toBe(false);
  });
});

describe("quality thresholds and floors", () => {
  it("rejects a draft whose source is not credible (accuracy floor)", () => {
    const card = runPipeline([{ ...base, source: { url: "https://example.com/x", publisher: "x" } }], { now: DEMO_NOW }).cards[0]!;
    expect(card.reviewStatus).toBe("rejected");
    expect(card.quality.floorBreaches.join(" ")).toMatch(/accuracy/);
  });
  it("rejects a duplicate regardless of other scores (originality floor)", () => {
    const card = runPipeline([base], { now: DEMO_NOW, catalogueUrls: [base.source.url] }).cards[0]!;
    expect(card.reviewStatus).toBe("rejected");
    expect(card.quality.floorBreaches.join(" ")).toMatch(/originality/);
  });
  it("rejects a draft with an unstorable (too-short) title (clarity floor)", () => {
    const card = runPipeline([{ ...base, title: "short" }], { now: DEMO_NOW }).cards[0]!;
    expect(card.reviewStatus).toBe("rejected");
  });
  it("queues a strong, well-sourced draft", () => {
    const card = runPipeline([base], { now: DEMO_NOW }).cards[0]!;
    expect(card.reviewStatus).toBe("editorial_queue");
  });
});

describe("high-impact escalation", () => {
  it("requires an independent second reviewer for a high-impact category", () => {
    expect(classifySafety({ ...base, category: "personal-finance", topic: "budgeting" }).requiresSecondReviewer).toBe(true);
  });
  it("does not escalate an ordinary technology card", () => {
    expect(classifySafety(base).requiresSecondReviewer).toBe(false);
  });
  it("escalates on a risk phrase even outside a high-impact category", () => {
    const s = classifySafety({ ...base, summary: `${base.summary} dosage guidance` });
    expect(s.isHighImpact).toBe(true);
    expect(s.riskNotes.length).toBeGreaterThan(0);
  });
});

describe("safety: default-deny writes and no automatic publishing", () => {
  it("refuses any attempt to attach a publisher/writer", () => {
    expect(() => runPipeline([base], { now: DEMO_NOW, publisher: {} })).toThrow(/read-only|not permitted/i);
  });
  it("never produces a published card — only review states", () => {
    const { cards } = runPipeline(DEMO_DRAFTS, { now: DEMO_NOW });
    for (const c of cards) {
      expect(["editorial_queue", "revise", "rejected"]).toContain(c.reviewStatus);
      expect((c as unknown as Record<string, unknown>).status).toBeUndefined();
    }
  });
});

describe("deterministic output from fixed fixtures", () => {
  it("produces identical results across runs", () => {
    const a = runPipeline(DEMO_DRAFTS, { now: DEMO_NOW });
    const b = runPipeline(DEMO_DRAFTS, { now: DEMO_NOW });
    expect(a).toEqual(b);
  });
  it("queues the eight demo drafts, all flagged for human fact-check, two needing a second reviewer", () => {
    const { summary } = runPipeline(DEMO_DRAFTS, { now: DEMO_NOW });
    expect(summary.total).toBe(8);
    expect(summary.queued).toBe(8);
    expect(summary.requiringFactCheck).toBe(8);
    expect(summary.requiringSecondReviewer).toBe(2);
  });
});
