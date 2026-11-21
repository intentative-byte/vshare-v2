/**
 * Pure editorial review-state logic — no React, no database, no I/O.
 *
 * Kept framework-free so it is exhaustively unit-testable and shared by the
 * authenticated workbench (and anything else that needs to describe where a
 * piece of content stands in review). It never decides publication eligibility
 * itself: it reads the server-computed `publicationEligible` flag and only
 * *describes* it. Nothing here grants access or writes anything.
 */

export type Decision = "approve" | "request_revision" | "reject" | "escalate";

export type ReviewStateKey =
  | "no_revision"
  | "approved_eligible"
  | "rejected"
  | "revision_requested"
  | "pending_second_review"
  | "pending_review";

export type ReviewTone = "neutral" | "good" | "warn" | "bad";

export type ReviewStateItem = {
  currentVersionId: string | null;
  isHighImpact: boolean;
  /** Server-computed; this module never recomputes it. */
  publicationEligible: boolean;
  /** Distinct approvers on the current revision (server-derived). */
  approversOnCurrent: number;
  decisions: Array<{ decision: Decision; onCurrentRevision: boolean; decidedAt: string }>;
};

export type ReviewState = {
  key: ReviewStateKey;
  label: string;
  tone: ReviewTone;
  explanation: string;
};

const STATES: Record<ReviewStateKey, Omit<ReviewState, "explanation">> = {
  no_revision: { key: "no_revision", label: "No revision", tone: "bad" },
  approved_eligible: { key: "approved_eligible", label: "Approved — eligible", tone: "good" },
  rejected: { key: "rejected", label: "Rejected", tone: "bad" },
  revision_requested: { key: "revision_requested", label: "Revision requested", tone: "warn" },
  pending_second_review: { key: "pending_second_review", label: "Pending second review", tone: "warn" },
  pending_review: { key: "pending_review", label: "Pending review", tone: "neutral" },
};

const EXPLANATIONS: Record<ReviewStateKey, string> = {
  no_revision: "This content has no current revision, so it cannot be reviewed yet.",
  approved_eligible:
    "The server reports the approval quorum for this revision is met. Eligibility is not publication — publishing stays a separate, explicit step.",
  rejected: "The latest decision on this revision is a rejection.",
  revision_requested: "A reviewer has asked for changes before this revision can be approved.",
  pending_second_review:
    "A high-impact item needs two distinct reviewers. One approval is recorded on this revision; a second, different reviewer must approve.",
  pending_review: "No decision has been recorded on the current revision yet.",
};

/** Human guidance shown next to each decision option in the form. */
export const DECISION_GUIDANCE: Record<Decision, string> = {
  approve:
    "Record that this revision meets the bar. High-impact content needs two distinct reviewers; you cannot approve the same revision twice.",
  request_revision:
    "Send it back for changes. Say what must change; a new revision will reset any prior approvals.",
  reject: "Decline this revision outright. Explain why, for the record and the submitter.",
  escalate: "Flag that this needs an independent second reviewer before any approval should count.",
};

/** A one-line description of a single recorded decision, for the audit list. */
export function reviewerExplanation(decision: Decision, onCurrentRevision: boolean): string {
  const base: Record<Decision, string> = {
    approve: "approved this revision",
    request_revision: "requested changes",
    reject: "rejected this revision",
    escalate: "escalated for an independent second review",
  };
  const suffix = onCurrentRevision ? "" : " (on a superseded revision — it no longer counts)";
  return base[decision] + suffix;
}

/**
 * Where a piece of content stands, derived deterministically. Eligibility (from
 * the server) wins; otherwise the latest decision on the current revision, with
 * the high-impact one-of-two case called out explicitly.
 */
export function deriveReviewState(item: ReviewStateItem): ReviewState {
  const withExplanation = (key: ReviewStateKey): ReviewState => ({
    ...STATES[key],
    explanation: EXPLANATIONS[key],
  });

  if (item.currentVersionId === null) {
    return withExplanation("no_revision");
  }
  if (item.publicationEligible) {
    return withExplanation("approved_eligible");
  }

  const onCurrent = item.decisions
    .filter((d) => d.onCurrentRevision)
    .slice()
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  const latest = onCurrent[0];

  if (latest?.decision === "reject") {
    return withExplanation("rejected");
  }
  if (latest?.decision === "request_revision") {
    return withExplanation("revision_requested");
  }
  if (item.isHighImpact && item.approversOnCurrent >= 1) {
    return withExplanation("pending_second_review");
  }
  if (latest?.decision === "escalate") {
    return withExplanation("pending_second_review");
  }
  return withExplanation("pending_review");
}

// ---------------------------------------------------------------- filters ---

export type ReviewFilters = {
  status: ReviewStateKey | "all";
  impact: "all" | "high" | "standard";
  topic: string | "all";
  /** "awaiting_me": the viewer can usefully act on this item now. */
  eligibility: "all" | "awaiting_me";
};

export const DEFAULT_FILTERS: ReviewFilters = {
  status: "all",
  impact: "all",
  topic: "all",
  eligibility: "all",
};

export type FilterableItem = ReviewStateItem & {
  topicName: string;
  viewerApprovedCurrent: boolean;
};

/** Whether an item should be shown under the given filters. Pure. */
export function matchesFilters(item: FilterableItem, filters: ReviewFilters): boolean {
  const state = deriveReviewState(item);

  if (filters.status !== "all" && state.key !== filters.status) {
    return false;
  }
  if (filters.impact === "high" && !item.isHighImpact) {
    return false;
  }
  if (filters.impact === "standard" && item.isHighImpact) {
    return false;
  }
  if (filters.topic !== "all" && item.topicName !== filters.topic) {
    return false;
  }
  if (filters.eligibility === "awaiting_me") {
    const actionable = state.key === "pending_review" || state.key === "pending_second_review";
    if (!actionable || item.viewerApprovedCurrent) {
      return false;
    }
  }
  return true;
}
