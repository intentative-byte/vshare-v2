import { describe, expect, it } from "vitest";
import {
  evidenceQuality,
  ORIGINALS_EDITORIAL,
  requiresSecondReview,
  validateDecision,
  type DecisionInput,
  type EditorialCard,
} from "@/components/editorial/editorial-data";

const byId = (id: string): EditorialCard => {
  const c = ORIGINALS_EDITORIAL.find((x) => x.id === id);
  if (!c) throw new Error(`no card ${id}`);
  return c;
};

const base = (over: Partial<DecisionInput>): DecisionInput => ({
  action: "approve",
  reviewerName: "Sam Reviewer",
  rationale: "Watched the source and confirmed the claims.",
  card: { highImpact: false },
  ...over,
});

describe("requiresSecondReview", () => {
  it("is true only for high-impact cards", () => {
    expect(requiresSecondReview({ highImpact: true })).toBe(true);
    expect(requiresSecondReview({ highImpact: false })).toBe(false);
  });
});

describe("evidenceQuality — from recorded fields, never fabricated", () => {
  it("limited when a source is blocked/limited", () => {
    expect(evidenceQuality(byId("a-first-monthly-budget"))).toBe("limited");
    expect(evidenceQuality(byId("getting-to-sleep"))).toBe("limited");
  });
  it("strong when every substantive claim is directly supported with high confidence", () => {
    expect(evidenceQuality(byId("secure-your-main-accounts"))).toBe("strong");
  });
  it("moderate otherwise", () => {
    expect(evidenceQuality(byId("what-a-neural-network-is"))).toBe("moderate");
  });
});

describe("validateDecision — human-only, high-impact gate", () => {
  it("accepts a well-formed non-high-impact decision", () => {
    expect(validateDecision(base({})).ok).toBe(true);
  });
  it("rejects a missing or too-short rationale", () => {
    expect(validateDecision(base({ rationale: "" })).ok).toBe(false);
    expect(validateDecision(base({ rationale: "ok" })).errors.join()).toMatch(/rationale/);
  });
  it("rejects a missing reviewer name", () => {
    expect(validateDecision(base({ reviewerName: "" })).ok).toBe(false);
  });
  it("refuses the generating agent as the reviewer", () => {
    for (const name of ["Claude", "the AI agent", "automated-bot", "Assistant"]) {
      const r = validateDecision(base({ reviewerName: name }));
      expect(r.ok, name).toBe(false);
      expect(r.errors.join()).toMatch(/generating agent cannot/i);
    }
  });
  it("blocks approving high-impact content without an independent second review", () => {
    const hi = base({ action: "approve", card: { highImpact: true } });
    expect(validateDecision(hi).ok).toBe(false);
    expect(validateDecision(hi).errors.join()).toMatch(/independent second review/i);
    expect(validateDecision({ ...hi, secondReviewDone: true }).ok).toBe(true);
  });
  it("allows request_revision / reject / escalate on high-impact without second review", () => {
    for (const action of ["request_revision", "reject", "escalate"] as const) {
      expect(validateDecision(base({ action, card: { highImpact: true } })).ok).toBe(true);
    }
  });
  it("rejects an invalid action", () => {
    expect(validateDecision(base({ action: "publish" as unknown as DecisionInput["action"] })).ok).toBe(false);
  });
});

describe("editorial data integrity", () => {
  it("has ten cards with only the allowed statuses and draft content state", () => {
    expect(ORIGINALS_EDITORIAL).toHaveLength(10);
    const allowed = ["READY FOR HUMAN REVIEW", "REVISION REQUIRED", "EVIDENCE BLOCKED"];
    for (const c of ORIGINALS_EDITORIAL) {
      expect(allowed).toContain(c.status);
      expect(c.contentState).toBe("draft"); // nothing approved/published
      expect(c.publicationBlockers.length).toBeGreaterThan(0); // no card is publish-ready
      if (c.highImpact) expect(c.publicationBlockers.join(" ")).toMatch(/second review/i);
      if (c.media) expect(c.media.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
  });
  it("marks every candidate video as not fact-checked", () => {
    for (const c of ORIGINALS_EDITORIAL) {
      if (c.media) expect(c.media.factualReview).toMatch(/not fact-checked/i);
    }
  });
});
