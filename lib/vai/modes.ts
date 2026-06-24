import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
import { getDecisionIntelligence } from "@/lib/recommendations/decision-recommendations";
import { getNetworkIntelligence } from "@/lib/network/network-intelligence";
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
  const network = getNetworkIntelligence(state);
  const [topPerson] = network.matches.people;

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
        ? `Challenge: learn ${nextConcept.concept}, apply it today, and collaborate with ${topPerson?.expert.name ?? "a relevant expert"}.`
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
      suggestion: `${action.title}. ${action.reason} Strategic relationship: ${topPerson?.expert.name ?? "build one expert connection"}. Decision lens: ${decision.latestRecommendation} Leverage pattern: ${success.worked[0]}.`,
      actionLabel: "Do next",
    };
  }

  return {
    mode: "partner",
    headline: "VAI Partner",
    suggestion: nextConcept
      ? `Suggested improvement: apply ${nextConcept.concept}; useful connection: ${topPerson?.expert.name ?? "follow a creator in this topic"}.`
      : `You are progressing toward ${learningMap.targetPosition}. Outcome velocity is ${outcomeScore.outcomeVelocity}.`,
    actionLabel: "Review suggestion",
  };
}
