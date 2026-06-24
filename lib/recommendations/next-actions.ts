import { detectBottlenecks } from "@/lib/bottlenecks/detect-bottlenecks";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
import type { LearningState } from "@/lib/types";

export type NextActionPlan = {
  today: string;
  thisWeek: string;
  thisMonth: string;
};

export function getNextActionPlan(state: LearningState): NextActionPlan {
  const action = getHighestLeverageAction(state);
  const [topBottleneck] = detectBottlenecks(state);
  const activeGoal = state.goals[0];

  return {
    today: action.title,
    thisWeek: topBottleneck ? `Reduce ${topBottleneck.label.toLowerCase()}: ${topBottleneck.reason}` : "Maintain current execution rhythm.",
    thisMonth: activeGoal ? `Produce measurable proof for ${activeGoal.title}.` : "Define one goal and ship one evidence-backed outcome.",
  };
}
