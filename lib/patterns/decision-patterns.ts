import { scoreDecisionQuality } from "@/lib/decisions/decision-framework";
import type { LearningState } from "@/lib/types";

export type DecisionPattern =
  | "procrastination"
  | "overthinking"
  | "impulsive_action"
  | "consistent_execution"
  | "high_quality_decisions";

export function getDecisionPatterns(state: LearningState): DecisionPattern[] {
  const patterns = new Set<DecisionPattern>();
  const decisions = state.decisions;
  const unresolved = decisions.filter((decision) => !decision.outcome);
  const resolved = decisions.filter((decision) => decision.outcome);
  const averageOptions = decisions.reduce((total, decision) => total + decision.options.length, 0) / Math.max(1, decisions.length);
  const averageQuality =
    decisions.reduce((total, decision) => total + scoreDecisionQuality(decision).decisionQualityScore, 0) / Math.max(1, decisions.length);
  const highRiskChoices = decisions.filter((decision) => {
    const chosenOption = decision.options.find((option) => option.id === decision.chosenOptionId);
    return chosenOption && chosenOption.risk > chosenOption.leverage + 20;
  });

  if (unresolved.length >= 3) {
    patterns.add("procrastination");
  }

  if (averageOptions >= 4) {
    patterns.add("overthinking");
  }

  if (highRiskChoices.length >= 2) {
    patterns.add("impulsive_action");
  }

  if (resolved.length >= Math.max(2, decisions.length * 0.6)) {
    patterns.add("consistent_execution");
  }

  if (averageQuality >= 72) {
    patterns.add("high_quality_decisions");
  }

  return Array.from(patterns);
}

export function getDecisionPatternSummary(state: LearningState) {
  const patterns = getDecisionPatterns(state);

  if (!patterns.length) {
    return "Decision memory is still forming.";
  }

  return patterns.map((pattern) => pattern.replaceAll("_", " ")).join(", ");
}
