import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getRecommendationFeedback(state: LearningState) {
  const recommendations = state.vaiDecisionMemory;
  const resolved = recommendations.filter((item) => item.result);
  const successful = resolved.filter((item) => !item.result?.toLowerCase().includes("failed"));
  const recentActions = state.signals.slice(-50).length;
  const recentOutcomes = state.outcomes.filter((outcome) => Date.now() - new Date(outcome.createdAt).getTime() <= 30 * 86400000).length;

  return {
    recommendations: recommendations.length,
    actions: recentActions,
    outcomes: state.outcomes.length,
    effectiveness: resolved.length ? clampScore((successful.length / resolved.length) * 100) : clampScore(recentOutcomes * 18 + recentActions),
    improvementSignal:
      successful.length >= resolved.length / 2
        ? "Recommendations are converting into useful action."
        : "Future recommendations should be more constrained and outcome-specific.",
  };
}
