import { normalizeGoal } from "@/lib/goals/goal-engine";
import type { LearningState } from "@/lib/types";

export function getTargetState(state: LearningState) {
  const goals = state.goals.map(normalizeGoal);
  const priorityGoal =
    goals.find((goal) => goal.priority === "critical") ??
    goals.find((goal) => goal.priority === "high") ??
    goals[0] ??
    null;

  return {
    desiredPosition: priorityGoal?.desiredOutcome ?? "Define a goal to set a target state",
    targetGoals: goals.slice(0, 3).map((goal) => goal.title),
    targetProjects: state.projects.filter((project) => project.status === "active").map((project) => project.title),
    targetCapabilities: priorityGoal?.topics.map((topic) => `${topic} applied capability`) ?? [],
    targetDeadline: priorityGoal?.deadline ?? null,
  };
}
