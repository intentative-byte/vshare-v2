import type { GoalDifficulty, GoalPriority, GoalType, Interest, LearningState, UserGoal } from "@/lib/types";

export const goalTypes: Array<{ value: GoalType; label: string }> = [
  { value: "learn", label: "Learn Goal" },
  { value: "career", label: "Career Goal" },
  { value: "business", label: "Business Goal" },
  { value: "health", label: "Health Goal" },
  { value: "financial", label: "Financial Goal" },
  { value: "project", label: "Project Goal" },
];

export function createGoal(input: {
  type: GoalType;
  title: string;
  desiredOutcome: string;
  topics: Interest[];
  targetDate?: string | null;
  deadline?: string | null;
  priority?: GoalPriority;
  difficulty?: GoalDifficulty;
  category?: GoalType;
}): UserGoal {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: input.type,
    title: input.title.trim(),
    desiredOutcome: input.desiredOutcome.trim(),
    topics: input.topics,
    priority: input.priority ?? "medium",
    difficulty: input.difficulty ?? "moderate",
    category: input.category ?? input.type,
    deadline: input.deadline ?? input.targetDate ?? null,
    targetDate: input.targetDate ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeGoal(goal: UserGoal): UserGoal {
  return {
    ...goal,
    priority: goal.priority ?? "medium",
    difficulty: goal.difficulty ?? "moderate",
    category: goal.category ?? goal.type,
    deadline: goal.deadline ?? goal.targetDate ?? null,
  };
}

export function isValidGoal(input: { title: string; desiredOutcome: string; topics: Interest[] }) {
  return input.title.trim().length >= 4 && input.desiredOutcome.trim().length >= 8 && input.topics.length > 0;
}

export function getGoalProgress(state: LearningState, goal: UserGoal) {
  const normalizedGoal = normalizeGoal(goal);
  const topicMastery =
    normalizedGoal.topics.reduce((total, topic) => total + (state.interestScores[topic] ?? 0), 0) /
    Math.max(1, normalizedGoal.topics.length);
  const relevantOutcomes = state.outcomes.filter((outcome) => outcome.topics.some((topic) => normalizedGoal.topics.includes(topic))).length;
  const relevantProjects = state.projects.filter((project) => project.topics.some((topic) => normalizedGoal.topics.includes(topic))).length;

  return Math.min(100, Math.round(topicMastery * 0.45 + relevantOutcomes * 18 + relevantProjects * 12));
}
