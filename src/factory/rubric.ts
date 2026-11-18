/**
 * The eight-axis educational quality rubric (Phase 10.1).
 *
 * Deterministic scoring from the draft, its evidence, the duplicate check and
 * the safety classification. HARD FLOORS can force a reject regardless of the
 * aggregate — a high composite can never override a critical failure. The score
 * is advisory to humans and is NEVER an auto-publish trigger.
 */
import type { DraftInput, EvidenceRecord, RubricAxis, RubricResult, RubricScores, SafetyResult } from "./types";
import type { DuplicateResult } from "./dedup";
import { classifyHost } from "./sources";

// Mirrors content_versions DB constraints, so an invalid draft can never be stored.
export const FIELD_LIMITS = {
  title: [10, 120] as const,
  summary: [40, 600] as const,
  nextStep: [10, 300] as const,
  takeawayMax: 300,
  takeawaysMax: 3,
};

const REVISE_MIN = 60;
const QUEUE_MIN = 75;

function hostClassScore(url: string): number {
  try {
    const cls = classifyHost(new URL(url).host);
    return { official: 5, institution: 4, named_expert: 3, community: 2, unknown: 0 }[cls];
  } catch {
    return 0;
  }
}

function fieldsValid(input: DraftInput): string[] {
  const bad: string[] = [];
  const len = (s: string) => s.trim().length;
  if (len(input.title) < FIELD_LIMITS.title[0] || len(input.title) > FIELD_LIMITS.title[1]) bad.push("title length");
  if (len(input.summary) < FIELD_LIMITS.summary[0] || len(input.summary) > FIELD_LIMITS.summary[1])
    bad.push("summary length");
  if (len(input.nextStep) < FIELD_LIMITS.nextStep[0] || len(input.nextStep) > FIELD_LIMITS.nextStep[1])
    bad.push("nextStep length");
  if (input.takeaways.length < 1 || input.takeaways.length > FIELD_LIMITS.takeawaysMax) bad.push("takeaways count");
  if (input.takeaways.some((t) => t.trim().length > FIELD_LIMITS.takeawayMax)) bad.push("takeaway too long");
  return bad;
}

const IMPERATIVE =
  /^(write|list|turn|set|pick|try|agree|decide|work|rewrite|choose|find|start|read|check|send|book|cut|do|make|open|use|review|ask|note|plan|add|remove|spend|call|draw|cook|fix|save|practise|practice|schedule|track|email|message|download)\b/i;

export function grade(
  input: DraftInput,
  evidence: EvidenceRecord,
  duplicate: DuplicateResult,
  safety: SafetyResult,
  now: Date = new Date(),
): RubricResult {
  const reasons = {} as Record<RubricAxis, string>;
  const floorBreaches: string[] = [];

  // Accuracy — from how far claims are actually supported.
  let accuracy: number;
  if (!evidence.sourceVerdict.ok || evidence.overall === "not_verified") {
    accuracy = 0;
    floorBreaches.push("accuracy: no credible, verifiable source for the claims");
    reasons.accuracy = "no credible source / unsupported claims";
  } else if (evidence.overall === "verified") {
    accuracy = 5;
    reasons.accuracy = "every claim supported by a supplied quote";
  } else {
    accuracy = 3;
    reasons.accuracy = "reputable source cited; claims await human fact-check";
  }

  // Source reliability — from the publisher class.
  const sourceReliability = hostClassScore(input.source.url);
  reasons.sourceReliability = `publisher class score ${sourceReliability}/5`;
  if (sourceReliability === 0) floorBreaches.push("sourceReliability: unverifiable publisher");

  // Usefulness — genuine takeaways + an actionable next step.
  let usefulness = 3;
  if (input.takeaways.length >= 1 && input.takeaways.every((t) => t.trim().length >= 20)) usefulness += 1;
  if (IMPERATIVE.test(input.nextStep.trim())) usefulness += 1;
  reasons.usefulness = usefulness >= 4 ? "clear takeaways and an actionable step" : "thin takeaways or weak next step";
  if (usefulness < 2) floorBreaches.push("usefulness: no genuine takeaway");

  // Clarity — field-limit compliance (DB storable) + brevity.
  const badFields = fieldsValid(input);
  let clarity = badFields.length === 0 ? 5 : 1;
  if (badFields.length > 0) {
    floorBreaches.push(`clarity: fields violate storage limits (${badFields.join(", ")})`);
    reasons.clarity = `invalid fields: ${badFields.join(", ")}`;
  } else {
    if (input.summary.length > 480) clarity -= 1;
    reasons.clarity = "within field limits";
  }

  // Practical application — concreteness of the next step.
  const practicalApplication = IMPERATIVE.test(input.nextStep.trim()) ? 5 : 2;
  reasons.practicalApplication = practicalApplication === 5 ? "imperative, concrete next step" : "vague next step";

  // Originality — from the duplicate check.
  let originality: number;
  if (duplicate.isDuplicate) {
    originality = 0;
    floorBreaches.push(`originality: ${duplicate.reason}`);
    reasons.originality = duplicate.reason;
  } else {
    originality = Math.max(0, Math.round(5 * (1 - duplicate.nearestTitleSimilarity)));
    reasons.originality = `distinct from catalogue (nearest similarity ${duplicate.nearestTitleSimilarity.toFixed(2)})`;
  }

  // Safety — risk phrases lower the score and force escalation.
  const severe = safety.riskNotes.length > 0;
  const safetyScore = severe ? 2 : safety.isHighImpact ? 4 : 5;
  reasons.safety = severe
    ? "risk phrases present; needs safety escalation"
    : safety.isHighImpact
      ? "high-impact; second reviewer required"
      : "no safety concerns";

  // Freshness — source date vs a conservative cadence (12 months).
  let freshness = 3;
  if (input.source.sourceDate) {
    const ageMonths = monthsSince(input.source.sourceDate, now);
    freshness = ageMonths <= 12 ? 5 : ageMonths <= 24 ? 4 : 2;
    reasons.freshness = `source ~${ageMonths} months old`;
    if (freshness <= 2 && safety.isHighImpact) floorBreaches.push("freshness: high-impact source is stale");
  } else {
    reasons.freshness = "source date unknown; needs a freshness check";
  }

  const scores: RubricScores = {
    accuracy,
    sourceReliability,
    usefulness,
    clarity,
    practicalApplication,
    originality,
    safety: safetyScore,
    freshness,
  };

  const mean = Object.values(scores).reduce((a, b) => a + b, 0) / 8;
  const composite = Math.max(0, Math.min(100, Math.round(20 * mean)));

  let verdict: RubricResult["verdict"];
  if (floorBreaches.length > 0) verdict = "reject";
  else if (composite < REVISE_MIN) verdict = "reject";
  else if (composite < QUEUE_MIN) verdict = "revise";
  else verdict = "queue";

  return { scores, reasons, composite, floorBreaches, verdict };
}

function monthsSince(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.round((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
}
