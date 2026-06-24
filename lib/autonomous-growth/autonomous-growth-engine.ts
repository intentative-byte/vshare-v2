import { getAdaptiveRoadmap } from "@/lib/adaptive-roadmaps/adaptive-roadmap";
import { getRecommendationFeedback } from "@/lib/feedback/recommendation-feedback";
import { getGovernorEngine } from "@/lib/governor/governor";
import { getUnifiedGrowthModel } from "@/lib/optimization/unified-growth-model";
import type { LearningState } from "@/lib/types";

export function getGrowthLoop(state: LearningState) {
  const feedback = getRecommendationFeedback(state);

  return {
    observe: `${state.signals.length} behavior signals captured`,
    learn: feedback.improvementSignal,
    recommend: state.vaiDecisionMemory[0]?.recommendation ?? "Generate a specific next action from the current goal",
    execute: state.outcomes[0]?.action ?? "Take one proof-producing action",
    measure: `${state.outcomes.length} outcomes logged`,
    improve: feedback.effectiveness >= 70 ? "Keep compounding the current loop" : "Tighten recommendations around outcomes",
  };
}

export function getAutonomousMissions(state: LearningState) {
  const roadmap = getAdaptiveRoadmap(state);

  return {
    daily: roadmap.capabilities[0] ?? "Apply one skill today",
    weekly: roadmap.projects[0] ?? "Move one proof project forward this week",
    monthly: roadmap.goals[0] ?? "Advance the primary goal this month",
  };
}

export function getAutonomousGrowthEngine(state: LearningState) {
  const growthModel = getUnifiedGrowthModel(state);
  const feedback = getRecommendationFeedback(state);
  const governor = getGovernorEngine(state);
  const roadmap = getAdaptiveRoadmap(state);

  return {
    growthLoop: getGrowthLoop(state),
    missions: getAutonomousMissions(state),
    roadmap,
    feedback,
    governor,
    unifiedGrowthModel: growthModel,
    compoundedGrowthRate: growthModel.compoundedGrowthRate,
    frictionReductionScore: Math.min(100, Math.round(feedback.effectiveness * 0.45 + (governor.protectsLongTermGrowth ? 35 : 15))),
  };
}
