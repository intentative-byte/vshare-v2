import type { LearningState } from "@/lib/types";

function since(days: number) {
  return Date.now() - days * 86400000;
}

function countOutcomes(state: LearningState, days: number) {
  const cutoff = since(days);
  return state.outcomes.filter((outcome) => new Date(outcome.createdAt).getTime() >= cutoff).length;
}

export function getOutcomeVelocity(state: LearningState) {
  return {
    resultsPerMonth: countOutcomes(state, 30),
    resultsPerQuarter: countOutcomes(state, 90),
    resultsPerYear: countOutcomes(state, 365),
  };
}
