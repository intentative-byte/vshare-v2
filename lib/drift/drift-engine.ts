import { getGoalProgress } from "@/lib/goals/goal-engine";
import type { LearningState } from "@/lib/types";

function recentSignalCount(state: LearningState, days: number) {
  const since = Date.now() - days * 86400000;
  return state.signals.filter((signal) => new Date(signal.occurredAt).getTime() >= since).length;
}

export function getDriftEngine(state: LearningState) {
  const abandonedGoals = state.goals.filter((goal) => getGoalProgress(state, goal) < 15 && goal.deadline && new Date(goal.deadline).getTime() < Date.now()).length;
  const abandonedProjects = state.projects.filter((project) => project.status === "abandoned").length;
  const focusChanged = state.interests.length > 3 && state.memory.lastActiveTopic && !state.interests.includes(state.memory.lastActiveTopic);
  const reducedExecution = recentSignalCount(state, 7) < Math.max(2, recentSignalCount(state, 30) / 8);
  const driftScore = Math.min(100, abandonedGoals * 24 + abandonedProjects * 18 + (focusChanged ? 18 : 0) + (reducedExecution ? 22 : 0));

  return {
    lossOfFocus: Boolean(focusChanged),
    changingPriorities: state.goals.length > 3,
    abandonedGoals,
    reducedExecution,
    driftScore,
  };
}
