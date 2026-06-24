import { getCapabilityScore } from "@/lib/capability/scoring";
import { getFocusEngine } from "@/lib/focus/focus-engine";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getStrategicAlignmentScore } from "@/lib/strategy/strategic-planning";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getSystemHealth(state: LearningState) {
  const capability = getCapabilityScore(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const focus = getFocusEngine(state);
  const knowledgeHealth = getKnowledgeGrowthScore(state);
  const capabilityHealth = capability.capabilityScore;
  const executionHealth = capability.executionScore;
  const outcomeHealth = outcome.combinedOutcomeScore;
  const focusHealth = clampScore(100 - focus.focusRisk);

  return {
    knowledgeHealth,
    capabilityHealth,
    executionHealth,
    outcomeHealth,
    focusHealth,
    strategicHealth: getStrategicAlignmentScore(state),
    overallHealth: clampScore(
      knowledgeHealth * 0.18 +
        capabilityHealth * 0.22 +
        executionHealth * 0.22 +
        outcomeHealth * 0.24 +
        focusHealth * 0.14,
    ),
  };
}
