import { getCapabilityScore } from "@/lib/capability/scoring";
import { getGoalProgress } from "@/lib/goals/goal-engine";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import type { GrowthScore, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getPersonalGrowthScore(state: LearningState): GrowthScore {
  const capability = getCapabilityScore(state);
  const goalProgress = state.goals.length
    ? state.goals.reduce((total, goal) => total + getGoalProgress(state, goal), 0) / state.goals.length
    : 0;
  const consistency = clampScore(state.streak * 12 + state.signals.slice(-30).length);
  const knowledgeGrowth = getKnowledgeGrowthScore(state);
  const capabilityGrowth = capability.capabilityScore;
  const executionGrowth = capability.executionScore;

  return {
    knowledgeGrowth,
    capabilityGrowth,
    executionGrowth,
    goalProgress: clampScore(goalProgress),
    consistency,
    personalGrowthScore: clampScore(
      knowledgeGrowth * 0.2 + capabilityGrowth * 0.28 + executionGrowth * 0.22 + goalProgress * 0.2 + consistency * 0.1,
    ),
  };
}
