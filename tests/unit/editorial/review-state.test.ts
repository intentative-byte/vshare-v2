import { describe, expect, it } from "vitest";
import {
  deriveReviewState,
  matchesFilters,
  reviewerExplanation,
  DECISION_GUIDANCE,
  DEFAULT_FILTERS,
  type FilterableItem,
  type ReviewStateItem,
} from "@/components/editorial/review-state";

function item(overrides: Partial<ReviewStateItem> = {}): ReviewStateItem {
  return {
    currentVersionId: "v1",
    isHighImpact: false,
    publicationEligible: false,
    approversOnCurrent: 0,
    decisions: [],
    ...overrides,
  };
}

describe("deriveReviewState", () => {
  it("reports no_revision when there is no current revision", () => {
    expect(deriveReviewState(item({ currentVersionId: null })).key).toBe("no_revision");
  });

  it("reports approved_eligible when the server says the quorum is met", () => {
    // Eligibility wins even if a later field looks ambiguous.
    const s = deriveReviewState(item({ publicationEligible: true, approversOnCurrent: 2 }));
    expect(s.key).toBe("approved_eligible");
    expect(s.tone).toBe("good");
  });

  it("reports pending_review when nothing is recorded on the current revision", () => {
    expect(deriveReviewState(item()).key).toBe("pending_review");
  });

  it("reports pending_second_review for a high-impact item with one approval", () => {
    const s = deriveReviewState(
      item({
        isHighImpact: true,
        approversOnCurrent: 1,
        decisions: [{ decision: "approve", onCurrentRevision: true, decidedAt: "2026-01-01T00:00:00Z" }],
      }),
    );
    expect(s.key).toBe("pending_second_review");
  });

  it("reports revision_requested when the latest current decision asks for changes", () => {
    const s = deriveReviewState(
      item({
        decisions: [
          { decision: "approve", onCurrentRevision: true, decidedAt: "2026-01-01T00:00:00Z" },
          { decision: "request_revision", onCurrentRevision: true, decidedAt: "2026-01-02T00:00:00Z" },
        ],
      }),
    );
    expect(s.key).toBe("revision_requested");
  });

  it("reports rejected when the latest current decision is a rejection", () => {
    const s = deriveReviewState(
      item({
        decisions: [{ decision: "reject", onCurrentRevision: true, decidedAt: "2026-01-03T00:00:00Z" }],
      }),
    );
    expect(s.key).toBe("rejected");
  });

  it("ignores decisions on superseded revisions", () => {
    const s = deriveReviewState(
      item({
        decisions: [{ decision: "approve", onCurrentRevision: false, decidedAt: "2026-01-01T00:00:00Z" }],
      }),
    );
    expect(s.key).toBe("pending_review");
  });

  it("treats escalate as pending_second_review", () => {
    const s = deriveReviewState(
      item({
        decisions: [{ decision: "escalate", onCurrentRevision: true, decidedAt: "2026-01-01T00:00:00Z" }],
      }),
    );
    expect(s.key).toBe("pending_second_review");
  });
});

describe("reviewerExplanation", () => {
  it("describes each decision", () => {
    expect(reviewerExplanation("approve", true)).toMatch(/approved/);
    expect(reviewerExplanation("reject", true)).toMatch(/rejected/);
  });
  it("flags superseded decisions", () => {
    expect(reviewerExplanation("approve", false)).toMatch(/superseded/);
  });
});

describe("DECISION_GUIDANCE", () => {
  it("has guidance for every decision type", () => {
    for (const key of ["approve", "request_revision", "reject", "escalate"] as const) {
      expect(DECISION_GUIDANCE[key].length).toBeGreaterThan(10);
    }
  });
});

function filterable(overrides: Partial<FilterableItem> = {}): FilterableItem {
  return {
    ...item(),
    topicName: "Personal finance",
    viewerApprovedCurrent: false,
    ...overrides,
  };
}

describe("matchesFilters", () => {
  it("passes everything with the default filters", () => {
    expect(matchesFilters(filterable(), DEFAULT_FILTERS)).toBe(true);
  });

  it("filters by impact level", () => {
    expect(matchesFilters(filterable({ isHighImpact: true }), { ...DEFAULT_FILTERS, impact: "high" })).toBe(true);
    expect(matchesFilters(filterable({ isHighImpact: false }), { ...DEFAULT_FILTERS, impact: "high" })).toBe(false);
    expect(matchesFilters(filterable({ isHighImpact: false }), { ...DEFAULT_FILTERS, impact: "standard" })).toBe(true);
  });

  it("filters by topic", () => {
    expect(matchesFilters(filterable({ topicName: "Health" }), { ...DEFAULT_FILTERS, topic: "Health" })).toBe(true);
    expect(matchesFilters(filterable({ topicName: "Career" }), { ...DEFAULT_FILTERS, topic: "Health" })).toBe(false);
  });

  it("filters by review status", () => {
    expect(matchesFilters(filterable(), { ...DEFAULT_FILTERS, status: "pending_review" })).toBe(true);
    expect(matchesFilters(filterable(), { ...DEFAULT_FILTERS, status: "rejected" })).toBe(false);
  });

  it("'awaiting_me' shows items the viewer can still act on", () => {
    // Pending review, viewer has not approved → awaiting me.
    expect(matchesFilters(filterable(), { ...DEFAULT_FILTERS, eligibility: "awaiting_me" })).toBe(true);
    // Already approved by the viewer → not awaiting me.
    expect(
      matchesFilters(filterable({ viewerApprovedCurrent: true }), { ...DEFAULT_FILTERS, eligibility: "awaiting_me" }),
    ).toBe(false);
    // Already eligible (quorum met) → not actionable.
    expect(
      matchesFilters(filterable({ publicationEligible: true }), { ...DEFAULT_FILTERS, eligibility: "awaiting_me" }),
    ).toBe(false);
  });
});
