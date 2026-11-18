/**
 * Safety and high-impact classification.
 *
 * High-impact categories carry real-world consequences (finance, health,
 * mental health, legal, safety, benefits). High-impact content must retain an
 * independent second-reviewer requirement (the database enforces this too) and
 * carries "educational, not advice" framing with professional signposting.
 */
import type { DraftInput, SafetyResult } from "./types";

/** Category slugs treated as high-impact (mirrors the taxonomy flags). */
export const HIGH_IMPACT_CATEGORIES = new Set<string>([
  "personal-finance",
  "health-and-wellbeing",
  "mental-health-and-resilience",
  "law-rights-and-citizenship",
  "civic-and-admin",
]);

/** Topic slugs that are high-impact even inside a non-high-impact category. */
export const HIGH_IMPACT_TOPICS = new Set<string>([
  "food-safety",
  "home-safety",
  "basic-repairs",
  "early-years-basics",
]);

/** Phrases that indicate a safety risk needing escalation regardless of category. */
const RISK_PHRASES = [
  "medication",
  "dosage",
  "diagnos",
  "invest in",
  "guaranteed return",
  "legal advice",
  "self-harm",
  "suicid",
];

export function classifySafety(input: DraftInput): SafetyResult {
  const riskNotes: string[] = [];
  const disclaimers: string[] = [];

  const categoryHighImpact = HIGH_IMPACT_CATEGORIES.has(input.category);
  const topicHighImpact = HIGH_IMPACT_TOPICS.has(input.topic);

  const haystack = `${input.title} ${input.summary} ${input.takeaways.join(" ")} ${input.nextStep}`.toLowerCase();
  const matchedPhrases = RISK_PHRASES.filter((p) => haystack.includes(p));
  for (const p of matchedPhrases) riskNotes.push(`risk phrase present: "${p}"`);

  const isHighImpact = categoryHighImpact || topicHighImpact || matchedPhrases.length > 0;

  if (isHighImpact) {
    disclaimers.push("Educational, not advice.");
    if (categoryHighImpact && input.category === "health-and-wellbeing") {
      disclaimers.push("Not medical advice; speak to a qualified professional about your situation.");
    }
    if (input.category === "mental-health-and-resilience") {
      disclaimers.push("If you need urgent help, contact a crisis service or your GP.");
    }
    if (input.category === "personal-finance") {
      disclaimers.push("General information, not financial advice about your circumstances.");
    }
    if (input.category === "law-rights-and-citizenship" || input.category === "civic-and-admin") {
      disclaimers.push("General information; the law and entitlements differ by jurisdiction and change over time.");
    }
  }

  return {
    isHighImpact,
    // High-impact always needs an independent second reviewer.
    requiresSecondReviewer: isHighImpact,
    disclaimers,
    riskNotes,
  };
}
