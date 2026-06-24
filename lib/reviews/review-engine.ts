import { getCapabilityScore } from "@/lib/capability/scoring";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { LearningState } from "@/lib/types";

export function getReviewCadence(state: LearningState) {
  const capability = getCapabilityScore(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const goalOS = getGoalOperatingSystem(state);

  return {
    weeklyReview: [
      `Review progress on ${goalOS.currentGoal?.title ?? "primary goal"}.`,
      `Check whether the next milestone moved: ${goalOS.nextMilestone?.label ?? "no milestone yet"}.`,
      "Choose one action to stop, one to double down on.",
    ],
    monthlyReview: [
      `Capability score: ${capability.capabilityScore}%.`,
      `Outcome score: ${outcome.combinedOutcomeScore}%.`,
      "Rebalance resources against the highest leverage goal.",
    ],
    quarterlyReview: [
      "Validate whether the current strategy still matches the desired future.",
      "Prune conflicting goals and abandoned projects.",
      "Update the 1-year strategic roadmap.",
    ],
  };
}
