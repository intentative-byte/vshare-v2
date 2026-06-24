import { getAdaptiveGovernance } from "@/lib/governance/adaptive-governance";
import { getSystemHealth } from "@/lib/health/system-health";
import { getNorthStar } from "@/lib/north-star/north-star";
import { getStrategicPlanningEngine } from "@/lib/strategy/strategic-planning";
import type { LearningState } from "@/lib/types";

export function getOperatorCommand(state: LearningState) {
  const health = getSystemHealth(state);
  const governance = getAdaptiveGovernance(state);
  const northStar = getNorthStar(state);
  const strategy = getStrategicPlanningEngine(state);
  const topCorrection = governance[0]?.correction;

  return {
    command: topCorrection ?? strategy.highestImpactActivities[0]?.activity ?? northStar.nextProof,
    reason: topCorrection ? `Governance correction required: ${governance[0].type}.` : northStar.reason,
    systemHealth: health.overallHealth,
    priority: governance[0]?.severity && governance[0].severity > 60 ? "stabilize" : "advance",
  };
}
