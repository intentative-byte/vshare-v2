import { projectScenarioAcrossHorizons } from "@/lib/futures/future-projection";
import { getSimulationRisk } from "@/lib/risk/risk-engine";
import { getScenarioOptions } from "@/lib/scenarios/scenario-model";
import type { LearningState } from "@/lib/types";

export type PathComparison = {
  optionLabel: string;
  risk: number;
  opportunity: number;
  expectedProgress: number;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getSimulationEngine(state: LearningState) {
  const options = getScenarioOptions(state);
  const risk = getSimulationRisk(state);
  const simulations = options.map((option) => ({
    option,
    projections: projectScenarioAcrossHorizons(state, option),
  }));
  const pathComparison: PathComparison[] = simulations.map((simulation) => {
    const projection90 = simulation.projections.find((projection) => projection.horizon === "90_days") ?? simulation.projections[0];

    return {
      optionLabel: simulation.option.label,
      risk: risk.overallRisk,
      opportunity: simulation.option.source.potentialImpact,
      expectedProgress: projection90.expectedProgress,
    };
  });
  const bestPath = [...pathComparison].sort((a, b) => b.expectedProgress - a.expectedProgress)[0] ?? null;
  const confidenceBefore = Math.max(20, 100 - risk.overallRisk);
  const confidenceAfter = clampScore(confidenceBefore + (bestPath?.expectedProgress ?? 0) * 0.25);

  return {
    inputs: {
      goals: state.goals,
      capabilities: state.conceptProgress,
      resources: state.timeAllocation,
      knowledge: state.interestScores,
      projects: state.projects,
      historicalOutcomes: state.outcomes,
    },
    simulations,
    pathComparison,
    risk,
    bestPath,
    decisionConfidence: {
      before: confidenceBefore,
      after: confidenceAfter,
      improvement: clampScore(confidenceAfter - confidenceBefore),
    },
  };
}
