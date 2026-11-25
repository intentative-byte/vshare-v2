/**
 * Live research integration: retrieve a source, verify a draft's claims against
 * the retrieved passages, and grade the result with the existing rubric.
 *
 * Accuracy is driven by what was RETRIEVED AND CHECKED, never by publisher
 * reputation alone: the evidence verdict comes from verifyClaims, and a draft
 * with any unsupported/contradictory/unavailable claim cannot be "verified".
 */
import type { DraftInput, EvidenceRecord, RubricResult, SafetyResult, VerificationStatus } from "../types";
import { detectDuplicate } from "../dedup";
import { classifySafety } from "../safety";
import { grade } from "../rubric";
import { verifySource } from "../sources";
import type { RetrievalResult } from "./source-adapter";
import { verifyClaims, type ClaimVerification } from "./verify";

export interface ResearchedCard {
  slug: string;
  category: string;
  topic: string;
  level: DraftInput["level"];
  objective: string;
  title: string;
  takeaways: string[];
  nextStep: string;
  source: DraftInput["source"];
  retrieval: {
    url: string;
    status: RetrievalResult["status"];
    httpStatus?: number;
    retrievedAt?: string;
    sourceDate?: string;
    missingTimestamp: boolean;
    passageCount: number;
  };
  verifications: ClaimVerification[];
  counts: { verified: number; unsupported: number; contradictory: number; unavailable: number };
  evidenceOverall: VerificationStatus;
  quality: RubricResult;
  safety: SafetyResult;
  reviewStatus: "editorial_queue" | "revise" | "rejected";
  requiresSecondReviewer: boolean;
}

function overallFrom(verifications: ClaimVerification[]): VerificationStatus {
  if (verifications.length === 0) return "not_verified";
  if (verifications.every((v) => v.verdict === "verified")) return "verified";
  return "not_verified";
}

export function researchDraft(
  draft: DraftInput,
  retrieval: RetrievalResult,
  options: { catalogueUrls?: string[]; now: string } = { now: new Date().toISOString() },
): ResearchedCard {
  const verifications = verifyClaims(
    draft.takeaways.map((t, i) => ({ text: t, quote: draft.supportingQuotes?.[i] })),
    retrieval,
  );
  const counts = {
    verified: verifications.filter((v) => v.verdict === "verified").length,
    unsupported: verifications.filter((v) => v.verdict === "unsupported").length,
    contradictory: verifications.filter((v) => v.verdict === "contradictory").length,
    unavailable: verifications.filter((v) => v.verdict === "unavailable").length,
  };
  const evidenceOverall = overallFrom(verifications);

  const sourceVerdict = verifySource(draft.source);
  const evidence: EvidenceRecord = {
    source: { ...draft.source, retrievedAt: retrieval.retrievedAt, sourceDate: retrieval.sourceDate ?? draft.source.sourceDate },
    sourceVerdict,
    claims: verifications.map((v) => ({
      claim: v.claim,
      supportingQuote: v.verdict === "verified" ? v.passage : undefined,
      verdict: (v.verdict === "verified" ? "verified" : "not_verified") as VerificationStatus,
      note: v.note,
    })),
    overall: evidenceOverall,
  };

  const duplicate = detectDuplicate(
    { url: draft.source.url, title: draft.title },
    (options.catalogueUrls ?? []).map((url) => ({ url })),
  );
  const safety = classifySafety(draft);
  const quality = grade({ ...draft, source: evidence.source }, evidence, duplicate, safety, new Date(options.now));

  const reviewStatus: ResearchedCard["reviewStatus"] =
    quality.verdict === "queue" ? "editorial_queue" : quality.verdict === "revise" ? "revise" : "rejected";

  return {
    slug: draft.slug,
    category: draft.category,
    topic: draft.topic,
    level: draft.level,
    objective: draft.objective,
    title: draft.title,
    takeaways: draft.takeaways,
    nextStep: draft.nextStep,
    source: evidence.source,
    retrieval: {
      url: retrieval.url,
      status: retrieval.status,
      httpStatus: retrieval.httpStatus,
      retrievedAt: retrieval.retrievedAt,
      sourceDate: retrieval.sourceDate,
      missingTimestamp: retrieval.missingTimestamp,
      passageCount: retrieval.passages.length,
    },
    verifications,
    counts,
    evidenceOverall,
    quality,
    safety,
    reviewStatus,
    requiresSecondReviewer: safety.requiresSecondReviewer,
  };
}
