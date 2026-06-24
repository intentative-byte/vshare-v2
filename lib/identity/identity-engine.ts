import { getCapabilityScore } from "@/lib/capability/scoring";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { LearningState } from "@/lib/types";

export function getIdentityEngine(state: LearningState) {
  const capability = getCapabilityScore(state);
  const goalOS = getGoalOperatingSystem(state);
  const currentIdentity =
    capability.executionScore >= 70
      ? "executor"
      : capability.applicationScore >= 60
        ? "builder"
        : capability.learningScore >= 60
          ? "learner"
          : "explorer";
  const desiredIdentity = goalOS.currentGoal
    ? `${goalOS.currentGoal.category} operator`
    : capability.capabilityScore >= 70
      ? "capability builder"
      : "focused learner";

  return {
    currentIdentity,
    desiredIdentity,
    identityGap:
      currentIdentity === desiredIdentity
        ? "Identity and direction are aligned."
        : `Shift from ${currentIdentity} to ${desiredIdentity} through proof, projects, and outcomes.`,
  };
}
