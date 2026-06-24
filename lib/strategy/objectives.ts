import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getFutureStateEngine } from "@/lib/future-state/future-state-engine";
import type { LearningState } from "@/lib/types";

export type StrategicObjectives = {
  primaryObjective: string;
  secondaryObjective: string;
  supportingObjectives: string[];
};

export function getStrategicObjectives(state: LearningState): StrategicObjectives {
  const goalOS = getGoalOperatingSystem(state);
  const futureState = getFutureStateEngine(state);

  return {
    primaryObjective: goalOS.currentGoal
      ? `Achieve ${goalOS.currentGoal.desiredOutcome}`
      : "Define one measurable destination.",
    secondaryObjective: futureState.gapAnalysis.requiredActions[0] ?? "Reduce the largest capability gap.",
    supportingObjectives: [
      goalOS.nextMilestone?.label ?? "Complete the next milestone.",
      futureState.identity.identityGap,
      `Improve trajectory accuracy to ${Math.min(100, futureState.optimizedFuture.confidence + 10)}%.`,
    ],
  };
}
