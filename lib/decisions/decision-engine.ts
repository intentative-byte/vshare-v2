import { getCapabilityScore } from "@/lib/capability/scoring";
import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getGoalProgress } from "@/lib/goals/goal-engine";
import { recommendTimeAllocation } from "@/lib/projects/time-allocation";
import type { LearningState } from "@/lib/types";

export type LeverageAction = {
  title: string;
  reason: string;
  mode: "learn" | "practice" | "build" | "teach";
  estimatedMinutes: number;
};

export function getHighestLeverageAction(state: LearningState, availableMinutes = 30): LeverageAction {
  const capability = getCapabilityScore(state);
  const [nextConcept] = getRecommendedNextConcepts(state);
  const activeGoal = [...state.goals].sort((a, b) => getGoalProgress(state, a) - getGoalProgress(state, b))[0];
  const allocation = recommendTimeAllocation(state);

  if (activeGoal && capability.executionScore < 45 && allocation.building >= allocation.learning) {
    return {
      title: `Build proof for ${activeGoal.title}`,
      reason: `Your goal progress needs execution evidence for: ${activeGoal.desiredOutcome}.`,
      mode: "build",
      estimatedMinutes: Math.min(availableMinutes, 45),
    };
  }

  if (nextConcept && capability.applicationScore < 50) {
    return {
      title: `Practice ${nextConcept.concept}`,
      reason: `This closes the highest visible gap in ${nextConcept.topic}.`,
      mode: "practice",
      estimatedMinutes: Math.min(availableMinutes, 25),
    };
  }

  if (state.userContributions.length < state.completedContentIds.length / 3) {
    return {
      title: "Teach one idea you completed",
      reason: "Teaching converts understanding into durable capability.",
      mode: "teach",
      estimatedMinutes: Math.min(availableMinutes, 15),
    };
  }

  return {
    title: nextConcept ? `Learn ${nextConcept.concept}` : "Log the next real-world outcome",
    reason: "This is the fastest path to measurable growth from your current state.",
    mode: nextConcept ? "learn" : "build",
    estimatedMinutes: Math.min(availableMinutes, 20),
  };
}
