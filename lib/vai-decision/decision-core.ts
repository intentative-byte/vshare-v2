import { detectBottlenecks } from "@/lib/bottlenecks/detect-bottlenecks";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { calculateLeverageScore } from "@/lib/leverage/leverage-engine";
import { getNextActionPlan } from "@/lib/recommendations/next-actions";
import { getGoalReasoning } from "@/lib/reasoning/goal-reasoning";
import type { LearningState } from "@/lib/types";

export function getVaiDecisionEngine(state: LearningState, availableMinutes = 30) {
  const bottlenecks = detectBottlenecks(state);
  const [topBottleneck] = bottlenecks;
  const action = getHighestLeverageAction(state, availableMinutes);
  const capability = getCapabilityScore(state);
  const leverage = calculateLeverageScore({
    bottleneck: topBottleneck,
    availableMinutes,
    confidenceBase: Math.max(35, capability.capabilityScore),
  });
  const [topGap] = getRecommendedNextConcepts(state);

  return {
    inputs: {
      goals: state.goals,
      knowledgeGaps: getRecommendedNextConcepts(state),
      projects: state.projects,
      outcomes: state.outcomes,
      availableMinutes,
      capability,
    },
    topOpportunity: topGap ? `${topGap.concept} in ${topGap.topic}` : action.title,
    topConstraint: topBottleneck.label,
    highestLeverageAction: action,
    recommendedNextStep: action.title,
    confidenceScore: leverage.confidence,
    expectedOutcome:
      action.mode === "build"
        ? "Evidence-backed capability gain"
        : action.mode === "practice"
          ? "Improved application score"
          : action.mode === "teach"
            ? "Better retention and teaching trust"
            : "Reduced knowledge gap",
    bottlenecks,
    leverage,
    nextActions: getNextActionPlan(state),
    goalReasoning: getGoalReasoning(state),
    recommendationMemory: state.vaiDecisionMemory,
    recommendationEffectiveness: state.vaiDecisionMemory.length
      ? Math.round((state.vaiDecisionMemory.filter((item) => item.result && !item.result.toLowerCase().includes("failed")).length / state.vaiDecisionMemory.length) * 100)
      : 0,
  };
}
