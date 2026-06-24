import type { Interest, UserGoal } from "@/lib/types";

const topicDependencies: Record<Interest, string[]> = {
  AI: ["Prompt Engineering", "Product", "Data", "Evaluation"],
  Business: ["Sales", "Marketing", "Operations", "Leadership"],
  Finance: ["Budgeting", "Revenue", "Risk", "Compounding"],
  Fitness: ["Nutrition", "Training", "Recovery", "Consistency"],
  Science: ["Evidence", "Experiment Design", "Systems Thinking"],
  Technology: ["Architecture", "APIs", "Databases", "Security"],
  Fashion: ["Materials", "Taste", "Buying Decisions"],
  Music: ["Practice", "Listening", "Rhythm"],
  Entrepreneurship: ["Sales", "Marketing", "Product", "Customer Discovery"],
  Other: ["Research", "Practice", "Feedback"],
};

export function getGoalDependencies(goal: UserGoal) {
  return Array.from(new Set(goal.topics.flatMap((topic) => topicDependencies[topic] ?? topicDependencies.Other)));
}

export function getFirstDependencies(goal: UserGoal) {
  return getGoalDependencies(goal).slice(0, 4);
}
