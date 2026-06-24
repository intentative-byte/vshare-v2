import type { DecisionOption, DecisionQualityScore, DecisionRecord, DecisionType } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function createDecisionOption(input: {
  label: string;
  upside: string;
  downside: string;
  risk: number;
  leverage: number;
}): DecisionOption {
  return {
    id: `option-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: input.label.trim(),
    upside: input.upside.trim(),
    downside: input.downside.trim(),
    risk: clampScore(input.risk),
    leverage: clampScore(input.leverage),
  };
}

export function scoreDecisionQuality(decision: DecisionRecord): DecisionQualityScore {
  const clarityScore = clampScore(
    (decision.decision.length >= 8 ? 25 : 8) +
      (decision.reason.length >= 12 ? 25 : 8) +
      (decision.desiredOutcome.length >= 12 ? 30 : 10) +
      (decision.chosenOptionId ? 20 : 0),
  );
  const optionQualityScore = clampScore(
    decision.options.length * 18 +
      decision.options.filter((option) => option.upside.length >= 8 && option.downside.length >= 8).length * 12,
  );
  const riskAwarenessScore = clampScore(decision.options.reduce((total, option) => total + option.risk, 0) / Math.max(1, decision.options.length));
  const leverageScore = clampScore(decision.options.reduce((total, option) => total + option.leverage, 0) / Math.max(1, decision.options.length));
  const outcomeScore = decision.outcome ? clampScore(55 + decision.outcome.length) : 0;

  return {
    clarityScore,
    optionQualityScore,
    riskAwarenessScore,
    leverageScore,
    outcomeScore,
    decisionQualityScore: clampScore(
      clarityScore * 0.26 + optionQualityScore * 0.22 + riskAwarenessScore * 0.18 + leverageScore * 0.22 + outcomeScore * 0.12,
    ),
  };
}

export function isValidDecision(input: {
  decision: string;
  reason: string;
  desiredOutcome: string;
  options: DecisionOption[];
  chosenOptionId: string;
}) {
  return (
    input.decision.trim().length >= 6 &&
    input.reason.trim().length >= 8 &&
    input.desiredOutcome.trim().length >= 8 &&
    input.options.length >= 2 &&
    input.options.some((option) => option.id === input.chosenOptionId)
  );
}

export function createDecisionRecord(input: {
  type: DecisionType;
  decision: string;
  reason: string;
  desiredOutcome: string;
  options: DecisionOption[];
  chosenOptionId: string;
}): DecisionRecord {
  const chosenOption = input.options.find((option) => option.id === input.chosenOptionId) ?? input.options[0];

  return {
    id: `decision-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: input.type,
    decision: input.decision.trim(),
    reason: input.reason.trim(),
    desiredOutcome: input.desiredOutcome.trim(),
    options: input.options,
    chosenOptionId: input.chosenOptionId,
    recommendation:
      chosenOption.leverage >= chosenOption.risk
        ? `Proceed with ${chosenOption.label}; leverage exceeds risk.`
        : `Reduce risk before committing to ${chosenOption.label}.`,
    outcome: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
}
