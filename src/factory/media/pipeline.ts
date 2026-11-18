/**
 * Candidate review pipeline:
 *   DISCOVER → VALIDATE → CLASSIFY → ASSESS → REVIEW → (human) APPROVE → DISPLAY
 *
 * The engine takes candidates to the REVIEW stage only. It never approves,
 * never publishes and never writes to the database. A human approves through
 * the existing moderation gates; only then is a candidate eligible for display.
 */
import type { MediaReview, QualityAssessment, SafetyAssessment, VideoCandidate } from "./types";
import { HIGH_IMPACT_CATEGORIES, HIGH_IMPACT_TOPICS } from "../safety";
import { buildEmbed } from "./providers";
import { verifyCandidate } from "./verify";

export function assessQuality(c: VideoCandidate): QualityAssessment {
  // Editorial signals only — NEVER view counts or popularity.
  const reasons: string[] = [];
  let score = 40;
  if (c.liveVerified === "verified") {
    score += 15;
    reasons.push("existence and attribution confirmed with the provider");
  } else {
    reasons.push("provider existence/attribution NOT verified (fixture)");
  }
  if (c.captionsAvailable) {
    score += 10;
    reasons.push("captions available (accessibility)");
  }
  if (c.licence) {
    score += 5;
    reasons.push(`licence stated: ${c.licence}`);
  }
  if (c.objective.trim().length >= 20) {
    score += 10;
    reasons.push("clear educational objective");
  }
  reasons.push("content not yet fact-checked — requires human review of the actual video");
  return { score: Math.min(100, score), reasons };
}

export function assessSafety(c: VideoCandidate): SafetyAssessment {
  const highImpact = HIGH_IMPACT_CATEGORIES.has(c.category) || HIGH_IMPACT_TOPICS.has(c.topic);
  const disclaimers: string[] = [];
  if (highImpact) disclaimers.push("Educational, not advice.");
  return {
    isHighImpact: highImpact,
    requiresSecondReviewer: highImpact,
    disclaimers,
    notes: highImpact ? ["high-impact topic: independent second reviewer required"] : [],
  };
}

export interface MediaPipelineResult {
  reviews: MediaReview[];
  summary: { total: number; validated: number; rejected: number; requiringSecondReviewer: number };
}

export interface MediaPipelineOptions {
  origin?: string;
  /** Must be absent — the engine cannot publish/write. */
  publisher?: unknown;
}

export function runMediaPipeline(candidates: VideoCandidate[], options: MediaPipelineOptions = {}): MediaPipelineResult {
  if (options.publisher !== undefined) {
    throw new Error("media pipeline is read-only: publishing/writing is not permitted");
  }

  const reviews: MediaReview[] = candidates.map((candidate) => {
    const issues = verifyCandidate(candidate);
    if (issues.length > 0) {
      return { candidate: { ...candidate, reviewStatus: "rejected" }, stage: "rejected", issues };
    }
    const assessed: VideoCandidate = {
      ...candidate,
      reviewStatus: "in_review", // never "approved" automatically
      quality: assessQuality(candidate),
      safety: assessSafety(candidate),
    };
    return {
      candidate: assessed,
      stage: "validated",
      issues: [],
      embed: buildEmbed(assessed, { origin: options.origin, enableJsApi: true, captions: true }),
    };
  });

  return {
    reviews,
    summary: {
      total: reviews.length,
      validated: reviews.filter((r) => r.stage === "validated").length,
      rejected: reviews.filter((r) => r.stage === "rejected").length,
      requiringSecondReviewer: reviews.filter((r) => r.candidate.safety?.requiresSecondReviewer).length,
    },
  };
}
