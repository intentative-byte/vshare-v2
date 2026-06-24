import { getGoalDependencies } from "@/lib/dependencies/dependency-engine";
import type { LearningState, UserGoal } from "@/lib/types";

export type GoalMilestone = {
  id: string;
  label: string;
  completed: boolean;
  horizon: "30_day" | "90_day" | "1_year";
};

export function getGoalMilestones(goal: UserGoal, state: LearningState): GoalMilestone[] {
  const dependencies = getGoalDependencies(goal);
  const hasProject = state.projects.some((project) => project.topics.some((topic) => goal.topics.includes(topic)));
  const hasOutcome = state.outcomes.some((outcome) => outcome.topics.some((topic) => goal.topics.includes(topic)));

  return [
    {
      id: `${goal.id}-baseline`,
      label: `Learn the first dependency: ${dependencies[0] ?? goal.topics[0]}`,
      completed: goal.topics.some((topic) => (state.interestScores[topic] ?? 0) >= 65),
      horizon: "30_day",
    },
    {
      id: `${goal.id}-project`,
      label: `Build a proof project for ${goal.title}`,
      completed: hasProject,
      horizon: "90_day",
    },
    {
      id: `${goal.id}-outcome`,
      label: `Log evidence for ${goal.desiredOutcome}`,
      completed: hasOutcome,
      horizon: "1_year",
    },
  ];
}

export function getNextMilestone(goal: UserGoal, state: LearningState) {
  return getGoalMilestones(goal, state).find((milestone) => !milestone.completed) ?? getGoalMilestones(goal, state)[0];
}
