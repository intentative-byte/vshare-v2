import { scoreDecisionQuality } from "@/lib/decisions/decision-framework";
import type { DecisionRecord, LearningState } from "@/lib/types";

export function getDecisionHistory(state: LearningState) {
  return [...state.decisions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getDecisionWins(state: LearningState) {
  return getDecisionHistory(state).filter((decision) => decision.outcome && scoreDecisionQuality(decision).decisionQualityScore >= 70);
}

export function getDecisionMistakes(state: LearningState) {
  return getDecisionHistory(state).filter((decision) => decision.outcome && scoreDecisionQuality(decision).decisionQualityScore < 50);
}

export function resolveDecision(decision: DecisionRecord, outcome: string): DecisionRecord {
  return {
    ...decision,
    outcome: outcome.trim(),
    resolvedAt: new Date().toISOString(),
  };
}
