import { getDigitalTwin } from "@/lib/digital-twin/twin-engine";
import { getFutureStateEngine } from "@/lib/future-state/future-state-engine";
import { getSimulationEngine } from "@/lib/simulation/simulation-engine";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getTrajectoryEngine(state: LearningState) {
  const twin = getDigitalTwin(state);
  const futureState = getFutureStateEngine(state);
  const simulation = getSimulationEngine(state);
  const alternativePaths = simulation.pathComparison.map((path) => ({
    label: path.optionLabel,
    expectedProgress: path.expectedProgress,
    risk: path.risk,
  }));
  const projectedPath = futureState.likelyFuture.summary;
  const optimizedPath = futureState.optimizedFuture.summary;
  const trajectoryAccuracy = clampScore(
    twin.twinAccuracy * 0.35 +
      simulation.decisionConfidence.after * 0.25 +
      twin.momentum.momentumScore * 0.2 +
      (100 - twin.drift.driftScore) * 0.2,
  );

  return {
    currentPath: `${twin.currentState.capabilityScore}% capability with ${twin.momentum.momentumScore}% momentum`,
    projectedPath,
    optimizedPath,
    alternativePaths,
    trajectoryAccuracy,
    movingTowardDesiredFuture: futureState.likelyFuture.capability >= twin.currentState.capabilityScore,
  };
}
