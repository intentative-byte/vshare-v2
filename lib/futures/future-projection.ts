import { getCapabilityScore } from "@/lib/capability/scoring";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getSimulationRisk } from "@/lib/risk/risk-engine";
import type { LearningState } from "@/lib/types";
import type { ScenarioOption } from "@/lib/scenarios/scenario-model";

export type TimeHorizon = "30_days" | "90_days" | "1_year" | "3_years" | "5_years";

export type ScenarioProjection = {
  horizon: TimeHorizon;
  bestCase: string;
  expectedCase: string;
  worstCase: string;
  expectedProgress: number;
};

const horizonMultiplier: Record<TimeHorizon, number> = {
  "30_days": 1,
  "90_days": 2.2,
  "1_year": 4,
  "3_years": 8,
  "5_years": 11,
};

function formatHorizon(horizon: TimeHorizon) {
  return horizon.replace("_", " ");
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function projectScenario(state: LearningState, option: ScenarioOption, horizon: TimeHorizon): ScenarioProjection {
  const capability = getCapabilityScore(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const risk = getSimulationRisk(state);
  const multiplier = horizonMultiplier[horizon];
  const baseProgress = option.source.leverageScore * 0.45 + capability.capabilityScore * 0.25 + outcome.outcomeVelocity * 0.2;
  const expectedProgress = clampScore(baseProgress * (multiplier / 3) - risk.overallRisk * 0.25);

  return {
    horizon,
    bestCase: `${option.label} compounds into a visible outcome within ${formatHorizon(horizon)}.`,
    expectedCase: `${option.label} produces ${expectedProgress}% expected progress if execution stays consistent.`,
    worstCase: `${option.label} stalls if ${risk.overallRisk}% risk is not reduced first.`,
    expectedProgress,
  };
}

export function projectScenarioAcrossHorizons(state: LearningState, option: ScenarioOption) {
  return (["30_days", "90_days", "1_year", "3_years", "5_years"] as const).map((horizon) => projectScenario(state, option, horizon));
}
