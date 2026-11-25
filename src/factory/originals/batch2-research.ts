/**
 * Originals batch-2 — evidence review packs (Phase 10.13 T4).
 *
 * Pure assembly of a reviewer-facing pack from a REAL `researchDraft` result
 * (live retrieval + claim verification) plus the candidate's original (no-evidence)
 * rubric. It never fabricates: a claim is only "verified" when `verifyClaims`
 * found an actual overlapping passage in the retrieved source, and that passage
 * is carried through verbatim as the excerpt. A recommendation here is NEVER an
 * approval.
 */

import type { CatalogueEntry, DuplicateAssessment } from "../dedup";
import type { DraftInput, VerificationStatus } from "../types";
import type { ResearchedCard } from "../live";
import { classifyClaimSupport, type SupportClass, type SupportResult } from "../live/verify-support";
import { EXISTING_CATALOGUE } from "./batch2";

export interface ReviewPackClaim {
  claim: string;
  verdict: "verified" | "unsupported" | "contradictory" | "unavailable";
  /** A real excerpt from the retrieved source; present only when verified. */
  excerpt?: string;
  overlap: number;
  note: string;
  /** The improved 5-way textual-support classification (T4b). Never approval. */
  support: SupportResult;
}

export interface ReviewPack {
  slug: string;
  objective: string;
  category: string;
  topic: string;
  level: DraftInput["level"];
  provenance: {
    url: string;
    publisher: string;
    retrievalStatus: ResearchedCard["retrieval"]["status"];
    httpStatus?: number;
    retrievedAt?: string;
    sourceDate?: string;
    missingTimestamp: boolean;
  };
  claims: ReviewPackClaim[];
  evidenceGaps: string[];
  evidenceOverall: VerificationStatus;
  counts: ResearchedCard["counts"];
  rubric: {
    original: { composite: number; verdict: string };
    updated: { composite: number; verdict: string; floorBreaches: string[] };
  };
  highImpact: { isHighImpact: boolean; requiresSecondReviewer: boolean };
  duplicate: DuplicateAssessment;
  /** Counts of the improved per-claim support classes. */
  supportSummary: Record<SupportClass, number>;
  reviewerQuestions: string[];
  /** A recommended next editorial action. NOT an approval. */
  recommendedAction: string;
}

/** Build the dedup catalogue: batch-1 (seed) plus the other batch-2 candidates. */
export function batch2DedupCatalogue(
  all: DraftInput[],
  self: DraftInput,
  batch1: CatalogueEntry[] = EXISTING_CATALOGUE,
): CatalogueEntry[] {
  const others = all
    .filter((d) => d.slug !== self.slug)
    .map<CatalogueEntry>((d) => ({ url: d.source.url, title: d.title }));
  return [...batch1, ...others];
}

function reviewerQuestions(pack: Omit<ReviewPack, "reviewerQuestions" | "recommendedAction">): string[] {
  const qs: string[] = [];
  if (pack.provenance.retrievalStatus !== "ok") {
    qs.push(
      `The source could not be retrieved cleanly (status: ${pack.provenance.retrievalStatus}). Is there an accessible, canonical source for this?`,
    );
  }
  for (const c of pack.claims) {
    if (c.verdict !== "verified") {
      qs.push(`Does the source actually substantiate this claim (verdict: ${c.verdict})? — "${c.claim}"`);
    }
  }
  if (pack.evidenceOverall !== "verified") {
    qs.push("What primary source grounds the claims the retrieval did not confirm?");
  }
  if (pack.highImpact.isHighImpact) {
    qs.push("High-impact: has a second, independent authorised reviewer verified this before any approval?");
  }
  if (pack.duplicate.verdict === "near_duplicate_review") {
    qs.push(
      `Is this materially different from the near-duplicate already in the catalogue (${pack.duplicate.matches[0]?.url ?? "see matches"})?`,
    );
  }
  if (pack.provenance.missingTimestamp) {
    qs.push("The source had no publication/retrieval timestamp — is it current enough to rely on?");
  }
  return qs;
}

function recommendedAction(pack: Omit<ReviewPack, "recommendedAction">): string {
  const suffix = " (Not an approval — a human editorial decision is still required.)";
  const s = pack.supportSummary;
  const hasRealSupport = s.exact_support + s.semantic_support > 0;
  if (pack.provenance.retrievalStatus !== "ok") {
    return "Find an accessible canonical source; do not take this further until it can be retrieved." + suffix;
  }
  if (pack.duplicate.verdict === "exact_duplicate") {
    return "Drop or merge: the source already exists in the catalogue." + suffix;
  }
  if (s.contradiction > 0) {
    return "A source passage appears to contradict a claim — a human must resolve this before anything else." + suffix;
  }
  if (pack.rubric.updated.verdict === "reject") {
    return hasRealSupport
      ? "Some claims have textual support; a human should rewrite the unsupported claims to match what the source actually says, then re-grade." +
          suffix
      : "No claim is supported by the retrieved source — gather evidence or rewrite from a real source before re-grading." +
          suffix;
  }
  if (pack.rubric.updated.verdict === "revise") {
    return "Revise to close the evidence gaps, then re-grade and re-review." + suffix;
  }
  if (pack.highImpact.isHighImpact) {
    return "Route to human editorial review WITH an independent second reviewer." + suffix;
  }
  return "Route to human editorial review." + suffix;
}

export function buildReviewPack(args: {
  candidate: DraftInput;
  researched: ResearchedCard;
  /** The actual retrieved passages, for the improved support classification. */
  passages: string[];
  original: { composite: number; verdict: string };
  duplicate: DuplicateAssessment;
}): ReviewPack {
  const { candidate, researched, passages, original, duplicate } = args;

  const claims: ReviewPackClaim[] = researched.verifications.map((v) => ({
    claim: v.claim,
    verdict: v.verdict,
    excerpt: v.verdict === "verified" ? v.passage : undefined,
    overlap: v.overlap,
    note: v.note,
    support: classifyClaimSupport(v.claim, passages),
  }));

  const supportSummary: Record<SupportClass, number> = {
    exact_support: 0,
    semantic_support: 0,
    partial_support: 0,
    contradiction: 0,
    insufficient_evidence: 0,
  };
  for (const c of claims) supportSummary[c.support.supportClass] += 1;

  const evidenceGaps: string[] = [];
  for (const c of claims) {
    if (c.verdict === "unsupported") evidenceGaps.push(`Unsupported: "${c.claim}"`);
    if (c.verdict === "contradictory") evidenceGaps.push(`Contradicted by the source: "${c.claim}"`);
    if (c.verdict === "unavailable") evidenceGaps.push(`Source unavailable for: "${c.claim}"`);
  }
  if (researched.retrieval.status !== "ok") {
    evidenceGaps.push(`Retrieval status: ${researched.retrieval.status}`);
  }
  if (researched.retrieval.missingTimestamp) {
    evidenceGaps.push("No publication/retrieval timestamp on the source.");
  }

  const base: Omit<ReviewPack, "reviewerQuestions" | "recommendedAction"> = {
    slug: candidate.slug,
    objective: candidate.objective,
    category: candidate.category,
    topic: candidate.topic,
    level: candidate.level,
    provenance: {
      url: candidate.source.url,
      publisher: candidate.source.publisher,
      retrievalStatus: researched.retrieval.status,
      httpStatus: researched.retrieval.httpStatus,
      retrievedAt: researched.retrieval.retrievedAt,
      sourceDate: researched.retrieval.sourceDate,
      missingTimestamp: researched.retrieval.missingTimestamp,
    },
    claims,
    evidenceGaps,
    evidenceOverall: researched.evidenceOverall,
    counts: researched.counts,
    rubric: {
      original,
      updated: {
        composite: researched.quality.composite,
        verdict: researched.quality.verdict,
        floorBreaches: researched.quality.floorBreaches,
      },
    },
    highImpact: {
      isHighImpact: researched.safety.isHighImpact,
      requiresSecondReviewer: researched.safety.requiresSecondReviewer,
    },
    duplicate,
    supportSummary,
  };

  const reviewerQuestionsList = reviewerQuestions(base);
  const withQuestions = { ...base, reviewerQuestions: reviewerQuestionsList };
  return { ...withQuestions, recommendedAction: recommendedAction(withQuestions) };
}
