import { getCapabilityScore } from "@/lib/capability/scoring";
import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getGoalProgress } from "@/lib/goals/goal-engine";
import type { LearningState } from "@/lib/types";

export function getStateGapMap(state: LearningState) {
  const capability = getCapabilityScore(state);
  const priorityGoal = [...state.goals].sort((a, b) => getGoalProgress(state, a) - getGoalProgress(state, b))[0] ?? null;
  const goalProgress = priorityGoal ? getGoalProgress(state, priorityGoal) : 0;
  const gaps = getRecommendedNextConcepts(state);

  return {
    currentCapability: capability.capabilityScore,
    targetCapability: 85,
    capabilityGap: Math.max(0, 85 - capability.capabilityScore),
    goalGap: priorityGoal ? Math.max(0, 100 - goalProgress) : 100,
    knowledgeGaps: gaps.map((gap) => `${gap.concept} (${gap.topic})`),
    executionGap: Math.max(0, capability.learningScore - capability.executionScore),
    applicationGap: Math.max(0, capability.learningScore - capability.applicationScore),
  };
}
