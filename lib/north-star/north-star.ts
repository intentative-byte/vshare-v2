import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getOutcomeIntelligenceScore } from "@/lib/outcomes/outcome-intelligence";
import { getStrategicAlignmentScore } from "@/lib/strategy/strategic-planning";
import type { LearningState } from "@/lib/types";

export function getNorthStar(state: LearningState) {
  const goalOS = getGoalOperatingSystem(state);
  const economy = getPersonalEconomy(state);
  const outcome = getOutcomeIntelligenceScore(state);
  const strategicAlignment = getStrategicAlignmentScore(state);
  const objective =
    goalOS.currentGoal?.desiredOutcome ??
    economy.mostLeverage?.label ??
    "Create one measurable outcome that proves progress";

  return {
    highestLeverageObjective: objective,
    reason: `Alignment ${strategicAlignment}%, outcome score ${outcome.combinedOutcomeScore}%, leverage ${economy.leverageScore}%.`,
    nextProof: goalOS.nextMilestone?.label ?? "Log a real-world outcome with evidence.",
  };
}
