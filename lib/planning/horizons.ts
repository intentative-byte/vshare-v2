import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { LearningState } from "@/lib/types";

export type PlanningHorizon = {
  horizon: "30_days" | "90_days" | "1_year" | "3_years" | "10_years";
  focus: string;
  successMeasure: string;
};

export function getPlanningHorizons(state: LearningState): PlanningHorizon[] {
  const goalOS = getGoalOperatingSystem(state);
  const currentGoal = goalOS.currentGoal;
  const desiredOutcome = currentGoal?.desiredOutcome ?? "a defined outcome";

  return [
    {
      horizon: "30_days",
      focus: goalOS.nextMilestone?.label ?? "Clarify the primary goal and first milestone.",
      successMeasure: "One completed milestone with evidence.",
    },
    {
      horizon: "90_days",
      focus: `Build proof toward ${desiredOutcome}.`,
      successMeasure: "One shipped project or validated outcome.",
    },
    {
      horizon: "1_year",
      focus: `Turn ${currentGoal?.title ?? "the top goal"} into repeatable capability.`,
      successMeasure: "Multiple outcome proofs and a reusable playbook.",
    },
    {
      horizon: "3_years",
      focus: `Compound capability around ${desiredOutcome}.`,
      successMeasure: "Sustained execution, reputation, and network trust.",
    },
    {
      horizon: "10_years",
      focus: "Build a durable personal operating advantage.",
      successMeasure: "Identity, capability, and outcomes align over time.",
    },
  ];
}
