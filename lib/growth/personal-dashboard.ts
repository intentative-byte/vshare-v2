import { getCapabilityScore } from "@/lib/capability/scoring";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
import { getCurrentStateSnapshot } from "@/lib/digital-twin/state-model";
import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getGoalProgress } from "@/lib/goals/goal-engine";
import { getPersonalGrowthScore } from "@/lib/growth/growth-score";
import type { LearningState } from "@/lib/types";

export function getPersonalDashboard(state: LearningState) {
  const snapshot = getCurrentStateSnapshot(state);
  const capability = getCapabilityScore(state);
  const topGoal = [...state.goals].sort((a, b) => getGoalProgress(state, a) - getGoalProgress(state, b))[0];
  const [topGap] = getRecommendedNextConcepts(state);
  const growth = getPersonalGrowthScore(state);
  const action = getHighestLeverageAction(state);

  return {
    currentPosition: `${snapshot.focus} · ${capability.capabilityScore}% capability`,
    desiredPosition: topGoal?.desiredOutcome ?? "Define a goal to set a target position",
    progressGap: topGoal ? 100 - getGoalProgress(state, topGoal) : 100 - capability.capabilityScore,
    topOpportunity: topGap ? `${topGap.concept} in ${topGap.topic}` : "Convert learning into an outcome",
    topConstraint: capability.executionScore < capability.learningScore ? "Execution is lagging knowledge" : "Choose a sharper target",
    recommendedNextAction: action,
    growth,
    snapshot,
  };
}
