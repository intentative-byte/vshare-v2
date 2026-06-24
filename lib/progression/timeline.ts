import { getOutcomeLabel } from "@/lib/outcomes/outcome-system";
import type { LearningState } from "@/lib/types";

export function getCapabilityTimeline(state: LearningState) {
  const outcomeEvents = state.outcomes.map((outcome) => ({
    id: outcome.id,
    date: outcome.createdAt,
    title: getOutcomeLabel(outcome.type),
    detail: outcome.title,
    strength: outcome.evidenceIds.length ? "verified" : "logged",
  }));
  const conceptEvents = Object.values(state.conceptProgress).map((progress) => ({
    id: `${progress.topic}-${progress.skill}`,
    date: progress.updatedAt,
    title: `${progress.stage} ${progress.skill}`,
    detail: progress.topic,
    strength: progress.stage,
  }));

  return [...outcomeEvents, ...conceptEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 16);
}
