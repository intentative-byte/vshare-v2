import { scoreDecisionQuality } from "@/lib/decisions/decision-framework";
import { getDecisionMistakes, getDecisionWins } from "@/lib/history/decision-history";
import { getDecisionPatterns } from "@/lib/patterns/decision-patterns";
import type { DecisionOption, DecisionRecord, LearningState } from "@/lib/types";

function scoreOption(option: DecisionOption) {
  return option.leverage * 1.4 - option.risk * 0.8 + (option.upside.length >= 10 ? 8 : 0) - (option.downside.length < 5 ? 8 : 0);
}

export function recommendDecisionPath(decision: DecisionRecord) {
  const rankedOptions = [...decision.options].sort((a, b) => scoreOption(b) - scoreOption(a));
  const bestOption = rankedOptions[0];

  return {
    option: bestOption,
    recommendation:
      bestOption.risk > bestOption.leverage
        ? `Run a small test before choosing ${bestOption.label}.`
        : `Choose ${bestOption.label}; it has the strongest leverage-adjusted upside.`,
  };
}

export function getDecisionIntelligence(state: LearningState) {
  const decisions = state.decisions;
  const scores = decisions.map(scoreDecisionQuality);
  const averageDecisionQuality = Math.round(
    scores.reduce((total, score) => total + score.decisionQualityScore, 0) / Math.max(1, scores.length),
  );
  const latestDecision = decisions[0] ?? null;
  const path = latestDecision ? recommendDecisionPath(latestDecision) : null;
  const patterns = getDecisionPatterns(state);
  const wins = getDecisionWins(state);
  const mistakes = getDecisionMistakes(state);

  return {
    decisionQualityScore: averageDecisionQuality,
    patterns,
    wins,
    mistakes,
    latestRecommendation: path?.recommendation ?? "Log a decision to build decision memory.",
    highestLeveragePath: path?.option.label ?? "No decision path yet",
  };
}
