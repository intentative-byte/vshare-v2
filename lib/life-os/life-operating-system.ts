import { getCapabilityOperatingSystem } from "@/lib/capability/operating-system";
import { getDigitalTwin } from "@/lib/digital-twin/twin-engine";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getFutureStateEngine } from "@/lib/future-state/future-state-engine";
import { getAdaptiveGovernance } from "@/lib/governance/adaptive-governance";
import { getSystemHealth } from "@/lib/health/system-health";
import { knowledgeGraph } from "@/lib/knowledge-graph/schema";
import { getNorthStar } from "@/lib/north-star/north-star";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getLifeOperatingSystem(state: LearningState) {
  const digitalTwin = getDigitalTwin(state);
  const capability = getCapabilityOperatingSystem(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const economy = getPersonalEconomy(state);
  const goalOS = getGoalOperatingSystem(state);
  const future = getFutureStateEngine(state);
  const health = getSystemHealth(state);
  const governance = getAdaptiveGovernance(state);
  const northStar = getNorthStar(state);
  const topCorrection = governance[0]?.correction;
  const operator = {
    command: topCorrection ?? northStar.nextProof,
    reason: topCorrection ? `Governance correction required: ${governance[0].type}.` : northStar.reason,
    systemHealth: health.overallHealth,
    priority: governance[0]?.severity && governance[0].severity > 60 ? "stabilize" : "advance",
  };
  const lifeAlignmentScore = clampScore(
    health.overallHealth * 0.28 +
      goalOS.progress * 0.18 +
      outcome.combinedOutcomeScore * 0.22 +
      future.optimizedFuture.confidence * 0.14 +
      economy.leverageScore * 0.18 -
      (governance[0]?.severity ?? 0) * 0.12,
  );

  return {
    unifiedUserModel: {
      digitalTwin,
      knowledgeGraph,
      capabilityGraph: capability.graph,
      outcomeGraph: state.outcomes,
      decisionGraph: state.decisions,
      networkGraph: {
        nodeCount: 0,
        edges: [],
      },
    },
    commandCenter: {
      topOpportunity: future.gapAnalysis.requiredActions[0] ?? northStar.highestLeverageObjective,
      topConstraint: governance[0]?.correction ?? goalOS.topBottleneck.reason,
      recommendedAction: operator.command,
      goalProgress: goalOS.progress,
      outcomeProgress: outcome.combinedOutcomeScore,
      resourceAllocation: economy.allocation,
    },
    systemHealth: health,
    governance,
    northStar,
    operator,
    lifeAlignmentScore,
  };
}
