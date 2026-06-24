import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getVaiDecisionEngine } from "@/lib/vai-decision/decision-core";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getSimulationEngine } from "@/lib/simulation/simulation-engine";
import { getLifeOperatingSystem } from "@/lib/life-os/life-operating-system";
import { getCollectiveIntelligence } from "@/lib/community-intelligence/collective-intelligence";
import { getMarketIntelligence } from "@/lib/market/market-intelligence";
import { getAutonomousGrowthEngine } from "@/lib/autonomous-growth/autonomous-growth-engine";
import { getPersonalLearningMap } from "@/lib/intelligence/learning-map";
import type { LearningState } from "@/lib/types";

export type VaiGuidance = {
  mode: LearningState["vaiMode"];
  headline: string;
  suggestion: string;
  actionLabel: string;
};

export function getVaiGuidance(state: LearningState): VaiGuidance {
  const learningMap = getPersonalLearningMap(state);
  const [nextConcept] = getRecommendedNextConcepts(state);
  const outcomeScore = getOutcomeIntelligenceScore(state);
  const vaiDecision = getVaiDecisionEngine(state);
  const goalOS = getGoalOperatingSystem(state);
  const economy = getPersonalEconomy(state);
  const simulation = getSimulationEngine(state);
  const lifeOS = getLifeOperatingSystem(state);
  const collective = getCollectiveIntelligence(state);
  const market = getMarketIntelligence(state);
  const autonomousGrowth = getAutonomousGrowthEngine(state);

  if (state.vaiMode === "silent") {
    return {
      mode: "silent",
      headline: "VAI is observing",
      suggestion: "Your learning map updates quietly as you complete, revisit, and apply concepts.",
      actionLabel: "Keep learning",
    };
  }

  if (state.vaiMode === "coach") {
    return {
      mode: "coach",
      headline: "VAI Coach",
      suggestion: `Adopt proven behavior: ${collective.successfulBehavior}. Stop: ${economy.stopDoing} Do ${goalOS.nextMilestone?.label ?? vaiDecision.recommendedNextStep} and log proof.`,
      actionLabel: "Take action",
    };
  }

  if (state.vaiMode === "strategist") {
    return {
      mode: "strategist",
      headline: "VAI Strategist",
      suggestion: `Build market-valued capability: ${market.career.missingHighDemandSkills[0]?.skill ?? collective.superiorRoute}. Market alignment ${market.marketAlignmentScore}%. Next action: ${simulation.bestPath?.optionLabel ?? economy.mostLeverage?.label ?? vaiDecision.highestLeverageAction.title}.`,
      actionLabel: "Do next",
    };
  }

  if (state.vaiMode === "operator") {
    return {
      mode: "operator",
      headline: "VAI Operator",
      suggestion: `${lifeOS.operator.command}. ${lifeOS.operator.reason} Life alignment ${lifeOS.lifeAlignmentScore}%.`,
      actionLabel: lifeOS.operator.priority === "stabilize" ? "Stabilize system" : "Advance system",
    };
  }

  if (state.vaiMode === "governor") {
    return {
      mode: "governor",
      headline: "VAI Governor",
      suggestion: `${autonomousGrowth.governor.command}. ${autonomousGrowth.governor.protectionReason} Compounded growth rate ${autonomousGrowth.compoundedGrowthRate}%.`,
      actionLabel: autonomousGrowth.governor.mode === "protect" ? "Protect growth" : "Compound growth",
    };
  }

  return {
    mode: "partner",
    headline: "VAI Partner",
    suggestion: nextConcept
      ? `Proven path: ${collective.provenPath}. Suggested improvement: ${vaiDecision.recommendedNextStep}.`
      : `You are progressing toward ${learningMap.targetPosition}. Outcome velocity is ${outcomeScore.outcomeVelocity}.`,
    actionLabel: "Review suggestion",
  };
}
