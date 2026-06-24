import { getCapabilityScore } from "@/lib/capability/scoring";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import { getMarketIntelligence } from "@/lib/market/market-intelligence";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getUnifiedGrowthModel(state: LearningState) {
  const capability = getCapabilityScore(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const economy = getPersonalEconomy(state);
  const market = getMarketIntelligence(state);
  const execution = capability.executionScore;
  const compoundedGrowthRate = clampScore(
    getKnowledgeGrowthScore(state) * 0.18 +
      capability.capabilityScore * 0.24 +
      execution * 0.2 +
      outcome.combinedOutcomeScore * 0.22 +
      economy.leverageScore * 0.1 +
      market.marketAlignmentScore * 0.06,
  );

  return {
    knowledge: getKnowledgeGrowthScore(state),
    capability: capability.capabilityScore,
    execution,
    outcomes: outcome.combinedOutcomeScore,
    resources: economy.leverageScore,
    marketDemand: market.marketAlignmentScore,
    compoundedGrowthRate,
  };
}
