import { getDigitalTwin } from "@/lib/digital-twin/twin-engine";
import { getIdentityEngine } from "@/lib/identity/identity-engine";
import { getFutureProjections } from "@/lib/projections/future-projections";
import type { LearningState } from "@/lib/types";

export function getFutureStateEngine(state: LearningState) {
  const twin = getDigitalTwin(state);
  const identity = getIdentityEngine(state);
  const futures = getFutureProjections(state);
  const likelyFuture = futures.find((future) => future.label === "Likely Future") ?? futures[0];
  const optimizedFuture = futures.find((future) => future.label === "Optimized Future") ?? futures[0];
  const requiredActions = [
    twin.gapMap.knowledgeGaps[0] ? `Close knowledge gap: ${twin.gapMap.knowledgeGaps[0]}` : null,
    twin.gapMap.executionGap > 20 ? "Convert learning into execution evidence." : null,
    twin.drift.driftScore > 40 ? "Reduce drift by narrowing goals and active projects." : null,
    `Move identity toward ${identity.desiredIdentity}.`,
  ].filter((action): action is string => Boolean(action));

  return {
    currentState: twin.currentState,
    targetState: twin.targetState,
    futureStates: futures,
    likelyFuture,
    optimizedFuture,
    stagnationFuture: futures.find((future) => future.label === "Stagnation Future") ?? futures[0],
    riskFuture: futures.find((future) => future.label === "Risk Future") ?? futures[0],
    gapAnalysis: {
      currentCapability: twin.gapMap.currentCapability,
      targetCapability: twin.gapMap.targetCapability,
      gap: twin.gapMap.capabilityGap,
      requiredActions,
    },
    identity,
  };
}
