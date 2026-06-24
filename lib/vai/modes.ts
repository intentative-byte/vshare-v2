import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
import { getDecisionIntelligence } from "@/lib/recommendations/decision-recommendations";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getSuccessAnalysis } from "@/lib/outcomes/success-analysis";
import { getPersonalLearningMap } from "@/lib/intelligence/learning-map";
import type { LearningState } from "@/lib/types";

export type VaiGuidance = {
  mode: LearningState["vaiMode"];
  headline: string;
  suggestion: string;
  actionLabel: string;
};

export function getVaiGuidance(state: LearningState): VaiGuidance {
  const learningMap = getPersonalLearningMap(state);
  const [nextConcept] = getRecommendedNextConcepts(state);
  const capability = getCapabilityScore(state);
  const outcomeScore = getOutcomeIntelligenceScore(state);

  if (state.vaiMode === "silent") {
    return {
      mode: "silent",
      headline: "VAI is observing",
      suggestion: "Your learning map updates quietly as you complete, revisit, and apply concepts.",
      actionLabel: "Keep learning",
    };
  }

  if (state.vaiMode === "coach") {
    return {
      mode: "coach",
      headline: "VAI Coach",
      suggestion: nextConcept
        ? `Challenge: learn ${nextConcept.concept}, apply it today, then log an outcome. Outcome velocity is ${outcomeScore.outcomeVelocity}.`
        : `Push the next measurable result. Capability score is ${capability.capabilityScore}.`,
      actionLabel: "Take action",
    };
  }

  if (state.vaiMode === "strategist") {
    const action = getHighestLeverageAction(state);
    const decision = getDecisionIntelligence(state);
    const success = getSuccessAnalysis(state);

    return {
      mode: "strategist",
      headline: "VAI Strategist",
      suggestion: `${action.title}. ${action.reason} Decision lens: ${decision.latestRecommendation} Leverage pattern: ${success.worked[0]}.`,
      actionLabel: "Do next",
    };
  }

  return {
    mode: "partner",
    headline: "VAI Partner",
    suggestion: nextConcept
      ? `Suggested improvement: apply ${nextConcept.concept} and convert it into an outcome.`
      : `You are progressing toward ${learningMap.targetPosition}. Outcome velocity is ${outcomeScore.outcomeVelocity}.`,
    actionLabel: "Review suggestion",
  };
}
