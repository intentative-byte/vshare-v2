import { getCapabilityTimeline } from "@/lib/progression/timeline";
import type { LearningState } from "@/lib/types";

export function getUserTimelines(state: LearningState) {
  const knowledgeTimeline = state.signals
    .filter((signal) => signal.type === "content_completed" || signal.type === "replay")
    .map((signal) => ({
      id: signal.id,
      date: signal.occurredAt,
      title: signal.type === "replay" ? "Revisited concept" : "Completed learning",
      detail: signal.contentId ?? "content",
    }));
  const goalTimeline = state.goals.map((goal) => ({
    id: goal.id,
    date: goal.createdAt,
    title: "Goal created",
    detail: goal.title,
  }));
  const outcomeTimeline = state.outcomes.map((outcome) => ({
    id: outcome.id,
    date: outcome.createdAt,
    title: "Outcome logged",
    detail: outcome.title,
  }));

  return {
    knowledgeTimeline: knowledgeTimeline.slice(-12).reverse(),
    capabilityTimeline: getCapabilityTimeline(state),
    goalTimeline: goalTimeline.slice(-12).reverse(),
    outcomeTimeline: outcomeTimeline.slice(-12).reverse(),
  };
}
