import { getCapabilityScore } from "@/lib/capability/scoring";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getSimulationEngine } from "@/lib/simulation/simulation-engine";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type FutureProjection = {
  label: "Likely Future" | "Optimized Future" | "Stagnation Future" | "Risk Future";
  summary: string;
  capability: number;
  outcomeVelocity: number;
  confidence: number;
};

export function getFutureProjections(state: LearningState): FutureProjection[] {
  const capability = getCapabilityScore(state);
  const economy = getPersonalEconomy(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const simulation = getSimulationEngine(state);
  const bestProgress = simulation.bestPath?.expectedProgress ?? 0;

  return [
    {
      label: "Likely Future",
      summary: `Continue current path: ${simulation.bestPath?.optionLabel ?? "steady learning and execution"}.`,
      capability: clampScore(capability.capabilityScore + bestProgress * 0.18),
      outcomeVelocity: clampScore(outcome.outcomeVelocity + bestProgress * 0.12),
      confidence: simulation.decisionConfidence.after,
    },
    {
      label: "Optimized Future",
      summary: `Double down on ${economy.doubleDown} and reduce ${economy.resourceConstraint.resource} constraints.`,
      capability: clampScore(capability.capabilityScore + bestProgress * 0.32 + economy.leverageScore * 0.12),
      outcomeVelocity: clampScore(outcome.outcomeVelocity + economy.leverageScore * 0.22),
      confidence: clampScore(simulation.decisionConfidence.after + 12),
    },
    {
      label: "Stagnation Future",
      summary: "Learning continues, but outcomes stay flat because execution does not increase.",
      capability: clampScore(capability.capabilityScore + 4),
      outcomeVelocity: clampScore(outcome.outcomeVelocity * 0.7),
      confidence: clampScore(100 - economy.opportunityCost.opportunityCostScore),
    },
    {
      label: "Risk Future",
      summary: `Focus fragments and ${economy.stopDoing.toLowerCase()}`,
      capability: clampScore(capability.capabilityScore - economy.focus.focusRisk * 0.18),
      outcomeVelocity: clampScore(outcome.outcomeVelocity - economy.opportunityCost.opportunityCostScore * 0.2),
      confidence: clampScore(100 - simulation.risk.overallRisk),
    },
  ];
}
