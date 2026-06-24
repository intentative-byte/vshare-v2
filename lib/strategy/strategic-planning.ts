import { getStrategicConstraints } from "@/lib/constraints/constraint-engine";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getPlanningHorizons } from "@/lib/planning/horizons";
import { getReviewCadence } from "@/lib/reviews/review-engine";
import { getHighestImpactActivities } from "@/lib/strategy/leverage-activities";
import { getStrategicObjectives } from "@/lib/strategy/objectives";
import { getStrategicRoadmap } from "@/lib/strategy/roadmap-engine";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function recentAlignedActions(state: LearningState) {
  const goalTopics = new Set(state.goals.flatMap((goal) => goal.topics));
  const recentSignals = state.signals.slice(-40);

  return recentSignals.filter((signal) => signal.topic && goalTopics.has(signal.topic)).length;
}

export function getStrategicAlignmentScore(state: LearningState) {
  const goalOS = getGoalOperatingSystem(state);
  const alignedActions = recentAlignedActions(state);
  const hasPrimaryGoal = goalOS.currentGoal ? 20 : 0;
  const milestoneProgress = goalOS.nextMilestone?.completed ? 20 : 8;
  const conflictPenalty = goalOS.conflicts.hasConflict ? 18 : 0;

  return clampScore(hasPrimaryGoal + goalOS.progress * 0.35 + alignedActions * 2 + milestoneProgress - conflictPenalty);
}

export function getStrategicPlanningEngine(state: LearningState) {
  return {
    horizons: getPlanningHorizons(state),
    objectives: getStrategicObjectives(state),
    constraints: getStrategicConstraints(state),
    highestImpactActivities: getHighestImpactActivities(state),
    roadmap: getStrategicRoadmap(state),
    reviews: getReviewCadence(state),
    strategicAlignmentScore: getStrategicAlignmentScore(state),
  };
}
