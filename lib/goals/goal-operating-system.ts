import { detectBottlenecks } from "@/lib/bottlenecks/detect-bottlenecks";
import { getHighestLeverageAction } from "@/lib/decisions/decision-engine";
import { detectGoalConflicts } from "@/lib/goal-health/conflicts";
import { getGoalHealthDashboard } from "@/lib/goal-health/goal-health";
import { getGoalProgress } from "@/lib/goals/goal-engine";
import { getGoalRoadmaps } from "@/lib/roadmaps/decompose-goal";
import type { LearningState } from "@/lib/types";

export function getGoalOperatingSystem(state: LearningState) {
  const health = getGoalHealthDashboard(state);
  const currentGoal = health[0]?.goal ?? null;
  const [topBottleneck] = detectBottlenecks(state);
  const recommendedAction = getHighestLeverageAction(state);
  const roadmaps = getGoalRoadmaps(state);
  const conflicts = detectGoalConflicts(state);

  return {
    currentGoal,
    progress: currentGoal ? getGoalProgress(state, currentGoal) : 0,
    nextMilestone: health[0]?.nextMilestone ?? null,
    topBottleneck,
    recommendedAction,
    health,
    conflicts,
    roadmaps,
    goalCompletionRate: state.goals.length
      ? Math.round((state.goals.filter((goal) => getGoalProgress(state, goal) >= 100).length / state.goals.length) * 100)
      : 0,
  };
}
