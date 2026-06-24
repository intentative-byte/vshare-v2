import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
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
        ? `Focus next on ${nextConcept.concept} in ${nextConcept.topic}. ${nextConcept.reason}`
        : `Push toward ${learningMap.targetPosition}.`,
      actionLabel: "Follow route",
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
