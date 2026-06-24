import { getAutonomousGrowthEngine } from "@/lib/autonomous-growth/autonomous-growth-engine";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getLifeOperatingSystem } from "@/lib/life-os/life-operating-system";
import { getVaiGuidance } from "@/lib/vai/modes";
import type { LearningState } from "@/lib/types";

export type UnifiedUserState = {
  interests: string[];
  currentGoal: string;
  nextMilestone: string;
  nextAction: string;
  topConstraint: string;
  governorState: string;
  dailyMission: string;
  growthScore: number;
  lifeAlignmentScore: number;
};

export function getUnifiedUserState(state: LearningState): UnifiedUserState {
  const goalOS = getGoalOperatingSystem(state);
  const lifeOS = getLifeOperatingSystem(state);
  const autonomousGrowth = getAutonomousGrowthEngine(state);

  return {
    interests: state.interests,
    currentGoal: goalOS.currentGoal?.title ?? "Set a destination",
    nextMilestone: goalOS.nextMilestone?.label ?? "Choose the next milestone",
    nextAction: lifeOS.commandCenter.recommendedAction,
    topConstraint: lifeOS.commandCenter.topConstraint,
    governorState: autonomousGrowth.governor.command,
    dailyMission: autonomousGrowth.missions.daily,
    growthScore: autonomousGrowth.compoundedGrowthRate,
    lifeAlignmentScore: lifeOS.lifeAlignmentScore,
  };
}

export function getVaiOrchestration(state: LearningState) {
  const unifiedState = getUnifiedUserState(state);
  const guidance = getVaiGuidance(state);

  return {
    ...unifiedState,
    headline: guidance.headline,
    reason: guidance.suggestion,
    actionLabel: guidance.actionLabel,
    mode: guidance.mode,
  };
}
