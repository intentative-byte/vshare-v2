import { getCapabilityOperatingSystem } from "@/lib/capability/operating-system";
import { getDecisionIntelligence } from "@/lib/recommendations/decision-recommendations";
import { getDigitalTwin } from "@/lib/digital-twin/twin-engine";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getFutureStateEngine } from "@/lib/future-state/future-state-engine";
import { getAdaptiveGovernance } from "@/lib/governance/adaptive-governance";
import { getSystemHealth } from "@/lib/health/system-health";
import { getLearningOperatingSystem } from "@/lib/intelligence/operating-system";
import { getNetworkIntelligence } from "@/lib/network/network-intelligence";
import { getNorthStar } from "@/lib/north-star/north-star";
import { getOperatorCommand } from "@/lib/operator/operator-mode";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getLifeOperatingSystem(state: LearningState) {
  const digitalTwin = getDigitalTwin(state);
  const knowledge = getLearningOperatingSystem(state);
  const capability = getCapabilityOperatingSystem(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const decision = getDecisionIntelligence(state);
  const economy = getPersonalEconomy(state);
  const goalOS = getGoalOperatingSystem(state);
  const future = getFutureStateEngine(state);
  const network = getNetworkIntelligence(state);
  const health = getSystemHealth(state);
  const governance = getAdaptiveGovernance(state);
  const northStar = getNorthStar(state);
  const operator = getOperatorCommand(state);
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
      knowledgeGraph: knowledge.knowledgeGraph,
      capabilityGraph: capability.graph,
      outcomeGraph: state.outcomes,
      decisionGraph: state.decisions,
      networkGraph: network.knowledgeNetwork,
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
