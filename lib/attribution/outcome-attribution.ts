import { getGoalProgress } from "@/lib/goals/goal-engine";
import type { LearningState, UserOutcome } from "@/lib/types";

export type OutcomeContributor = {
  label: string;
  type: "action" | "skill" | "learning_path" | "project" | "decision";
  contributionScore: number;
};

export function getOutcomeAttribution(state: LearningState, outcome: UserOutcome): OutcomeContributor[] {
  const actionContributor: OutcomeContributor = {
    label: outcome.action,
    type: "action",
    contributionScore: 28,
  };
  const skillContributors = Object.values(state.conceptProgress)
    .filter((progress) => outcome.topics.includes(progress.topic))
    .slice(0, 3)
    .map((progress) => ({
      label: progress.skill,
      type: "skill" as const,
      contributionScore: progress.stage === "mastered" ? 24 : progress.stage === "applied" ? 18 : 12,
    }));
  const pathContributors = state.followedPathIds.slice(0, 2).map((pathId) => ({
    label: pathId,
    type: "learning_path" as const,
    contributionScore: 12,
  }));
  const projectContributors = state.projects
    .filter((project) => project.topics.some((topic) => outcome.topics.includes(topic)))
    .slice(0, 2)
    .map((project) => ({
      label: project.title,
      type: "project" as const,
      contributionScore: project.status === "completed" ? 24 : 14,
    }));
  const decisionContributors = state.decisions
    .filter((decision) => decision.outcome)
    .slice(0, 2)
    .map((decision) => ({
      label: decision.decision,
      type: "decision" as const,
      contributionScore: 10,
    }));
  const goalContributor = state.goals
    .filter((goal) => goal.topics.some((topic) => outcome.topics.includes(topic)))
    .slice(0, 1)
    .map((goal) => ({
      label: goal.title,
      type: "action" as const,
      contributionScore: Math.min(20, getGoalProgress(state, goal) / 5),
    }));

  return [actionContributor, ...skillContributors, ...pathContributors, ...projectContributors, ...decisionContributors, ...goalContributor]
    .sort((a, b) => b.contributionScore - a.contributionScore)
    .slice(0, 6);
}

export function getOutcomeAttributionMap(state: LearningState) {
  return state.outcomes.map((outcome) => ({
    outcome,
    contributors: getOutcomeAttribution(state, outcome),
  }));
}
