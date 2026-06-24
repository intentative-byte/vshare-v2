import type { LearningState } from "@/lib/types";

function recentCount(dates: string[], days: number) {
  const since = Date.now() - days * 86400000;
  return dates.filter((date) => new Date(date).getTime() >= since).length;
}

export function getMomentumEngine(state: LearningState) {
  const signalMomentum = recentCount(state.signals.map((signal) => signal.occurredAt), 7);
  const outcomeMomentum = recentCount(state.outcomes.map((outcome) => outcome.createdAt), 30);
  const projectMomentum = recentCount(state.projects.map((project) => project.updatedAt), 14);
  const capabilityMomentum = recentCount(Object.values(state.conceptProgress).map((progress) => progress.updatedAt), 14);
  const momentumScore = Math.min(100, Math.round(signalMomentum * 3 + outcomeMomentum * 16 + projectMomentum * 8 + capabilityMomentum * 6));

  return {
    progressVelocity: momentumScore,
    signalMomentum,
    outcomeMomentum,
    projectMomentum,
    capabilityMomentum,
    momentumScore,
  };
}
