import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getRecommendedResourceAllocation } from "@/lib/allocation/allocation-engine";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getOpportunityCost(state: LearningState) {
  const allocation = getRecommendedResourceAllocation(state);
  const goal = getGoalOperatingSystem(state).currentGoal;
  const learningBias = state.signals.filter((signal) => signal.type === "content_completed").length;
  const executionProof = state.outcomes.length + state.projects.filter((project) => project.status === "completed").length;
  const overLearningCost = clampScore(Math.max(0, learningBias - executionProof * 2) * 6);
  const underOutreachCost = clampScore(goal?.type === "business" ? Math.max(0, 35 - allocation.outreach) * 2 : 0);
  const unfocusedCost = clampScore(Math.max(0, state.goals.length + state.projects.length + state.interests.length - 8) * 10);

  return {
    opportunityCostScore: clampScore(overLearningCost + underOutreachCost + unfocusedCost),
    stopDoing: overLearningCost > underOutreachCost ? "Stop defaulting to more learning before producing proof." : "Stop spreading effort across low-leverage priorities.",
    tradeoff: `Every hour over-allocated to low-leverage work delays ${goal?.title ?? "your top outcome"}.`,
  };
}
