import { getCapabilityScore } from "@/lib/capability/scoring";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import type { LearningState } from "@/lib/types";

export function getCompoundingModel(state: LearningState) {
  const knowledgeGrowth = getKnowledgeGrowthScore(state);
  const capabilityGrowth = getCapabilityScore(state).capabilityScore;
  const outcomeGrowth = getOutcomeIntelligenceScore(state).combinedOutcomeScore;
  const compoundingScore = Math.round(knowledgeGrowth * 0.25 + capabilityGrowth * 0.35 + outcomeGrowth * 0.4);

  return {
    knowledgeGrowth,
    capabilityGrowth,
    outcomeGrowth,
    compoundingScore,
  };
}
