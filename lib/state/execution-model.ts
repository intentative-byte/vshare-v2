import type { LearningState } from "@/lib/types";

export function getExecutionModel(state: LearningState) {
  const started = state.projects.filter((project) => project.status === "active").length + state.decisions.length;
  const finished = state.projects.filter((project) => project.status === "completed").length + state.outcomes.length;
  const abandoned = state.projects.filter((project) => project.status === "abandoned").length;
  const delayed = state.goals.filter((goal) => goal.deadline && new Date(goal.deadline).getTime() < Date.now()).length;

  return {
    started,
    finished,
    abandoned,
    delayed,
    pattern:
      finished >= started && started > 0
        ? "consistent finisher"
        : abandoned > 0
          ? "abandonment risk"
          : delayed > 0
            ? "deadline drift"
            : "execution pattern forming",
  };
}
