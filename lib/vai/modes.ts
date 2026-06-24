import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
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
        ? `Challenge: learn ${nextConcept.concept}, apply it today, then log proof. Capability delta is ${capability.capabilityDelta}.`
        : `Build evidence toward ${learningMap.targetPosition}. Capability score is ${capability.capabilityScore}.`,
      actionLabel: "Take action",
    };
  }

  if (state.vaiMode === "strategist") {
    const action = getHighestLeverageAction(state);

    return {
      mode: "strategist",
      headline: "VAI Strategist",
      suggestion: `${action.title}. ${action.reason} Allocate ${action.estimatedMinutes} minutes.`,
      actionLabel: "Do next",
    };
  }

  return {
    mode: "partner",
    headline: "VAI Partner",
    suggestion: nextConcept
      ? `Suggested next concept: ${nextConcept.concept} (${nextConcept.topic}).`
      : `You are progressing toward ${learningMap.targetPosition}.`,
    actionLabel: "Review suggestion",
  };
}
