import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getNetworkIntelligence } from "@/lib/network/network-intelligence";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getVaiDecisionEngine } from "@/lib/vai-decision/decision-core";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
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
  const outcomeScore = getOutcomeIntelligenceScore(state);
  const network = getNetworkIntelligence(state);
  const vaiDecision = getVaiDecisionEngine(state);
  const goalOS = getGoalOperatingSystem(state);
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
      suggestion: `Outcome challenge: ${goalOS.currentGoal?.desiredOutcome ?? "pick the outcome that matters most"}. Do ${goalOS.nextMilestone?.label ?? vaiDecision.recommendedNextStep} and log proof.`,
      actionLabel: "Take action",
    };
  }

  if (state.vaiMode === "strategist") {
    return {
      mode: "strategist",
      headline: "VAI Strategist",
      suggestion: `Optimize around ${goalOS.currentGoal?.desiredOutcome ?? "the highest-value outcome"}. ${vaiDecision.highestLeverageAction.title}. Outcome velocity ${outcomeScore.outcomeVelocity}%. Strategic relationship: ${topPerson?.expert.name ?? "build one expert connection"}.`,
      actionLabel: "Do next",
    };
  }

  return {
    mode: "partner",
    headline: "VAI Partner",
    suggestion: nextConcept
      ? `Suggested improvement: ${vaiDecision.recommendedNextStep}. Outcome target: ${goalOS.currentGoal?.desiredOutcome ?? nextConcept.concept}.`
      : `You are progressing toward ${learningMap.targetPosition}. Outcome velocity is ${outcomeScore.outcomeVelocity}.`,
    actionLabel: "Review suggestion",
  };
}
