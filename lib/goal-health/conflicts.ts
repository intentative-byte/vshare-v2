import { normalizeGoal } from "@/lib/goals/goal-engine";
import type { LearningState, UserGoal } from "@/lib/types";

function goalLoad(goal: UserGoal) {
  const normalizedGoal = normalizeGoal(goal);
  const priorityLoad = { low: 4, medium: 7, high: 10, critical: 14 }[normalizedGoal.priority];
  const difficultyLoad = { easy: 2, moderate: 5, hard: 8, extreme: 12 }[normalizedGoal.difficulty];

  return priorityLoad + difficultyLoad;
}

export function detectGoalConflicts(state: LearningState) {
  const activeGoals = state.goals.map(normalizeGoal);
  const totalLoad = activeGoals.reduce((total, goal) => total + goalLoad(goal), 0);
  const categoryCounts = new Map<string, number>();

  activeGoals.forEach((goal) => categoryCounts.set(goal.category, (categoryCounts.get(goal.category) ?? 0) + 1));

  const conflicts = Array.from(categoryCounts.entries())
    .filter(([, count]) => count > 2)
    .map(([category]) => `Too many ${category} goals competing for attention.`);

  if (totalLoad > 42) {
    conflicts.unshift("Goal schedule is likely impossible without reducing scope.");
  }

  return {
    totalLoad,
    conflicts,
    hasConflict: conflicts.length > 0,
  };
}
