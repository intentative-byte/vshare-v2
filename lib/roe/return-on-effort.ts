import { getOutcomeWeight } from "@/lib/outcomes/outcome-system";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getReturnOnEffort(state: LearningState) {
  const watchHours =
    Object.values(state.contentEngagement).reduce((total, engagement) => total + engagement.watchSeconds, 0) / 3600;
  const interactionHours = state.signals.length * 0.08;
  const estimatedTimeInvested = Math.max(1, watchHours + interactionHours);
  const outcomeValue = state.outcomes.reduce((total, outcome) => total + getOutcomeWeight(outcome.type) + outcome.evidenceIds.length * 8, 0);
  const returnOnEffort = clampScore(outcomeValue / estimatedTimeInvested);

  return {
    timeInvested: Math.round(estimatedTimeInvested * 10) / 10,
    outcomeProduced: outcomeValue,
    returnOnEffort,
    summary: returnOnEffort >= 70 ? "Effort is converting into outcomes." : "Improve conversion from effort to measurable outcomes.",
  };
}
