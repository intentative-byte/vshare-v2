import { getRecommendedResourceAllocation } from "@/lib/allocation/allocation-engine";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getFocusEngine } from "@/lib/focus/focus-engine";
import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getOpportunityCost } from "@/lib/opportunity-cost/opportunity-cost";
import { getPersonalResources, getResourceConstraint } from "@/lib/resources/resource-model";
import { getReturnOnEffort } from "@/lib/roe/return-on-effort";
import type { EconomyLeverageItem, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function rankLeverageItems(state: LearningState): EconomyLeverageItem[] {
  const capability = getCapabilityScore(state);
  const goalOS = getGoalOperatingSystem(state);
  const projectItems: EconomyLeverageItem[] = state.projects
    .filter((project) => project.status === "active")
    .map((project) => ({
      type: "project",
      label: project.title,
      potentialImpact: 78,
      difficulty: 55,
      timeRequired: 60,
      outcomeProbability: capability.executionScore,
      leverageScore: clampScore(78 * 0.35 + capability.executionScore * 0.3 + (100 - 55) * 0.2 + (100 - 60) * 0.15),
    }));
  const goalItems: EconomyLeverageItem[] = state.goals.slice(0, 4).map((goal) => ({
    type: "goal",
    label: goal.title,
    potentialImpact: goal.priority === "critical" ? 95 : goal.priority === "high" ? 82 : 65,
    difficulty: goal.difficulty === "extreme" ? 90 : goal.difficulty === "hard" ? 70 : goal.difficulty === "moderate" ? 50 : 30,
    timeRequired: goal.difficulty === "extreme" ? 90 : goal.difficulty === "hard" ? 70 : 45,
    outcomeProbability: goalOS.progress,
    leverageScore: clampScore((goal.priority === "critical" ? 95 : goal.priority === "high" ? 82 : 65) * 0.42 + goalOS.progress * 0.28),
  }));
  const skillItems: EconomyLeverageItem[] = Object.values(state.conceptProgress)
    .slice(0, 4)
    .map((skill) => ({
      type: "skill",
      label: skill.skill,
      potentialImpact: skill.stage === "mastered" ? 45 : 72,
      difficulty: skill.stage === "learned" ? 45 : 55,
      timeRequired: 35,
      outcomeProbability: skill.stage === "applied" || skill.stage === "repeated" ? 70 : 45,
      leverageScore: clampScore(72 * 0.35 + (skill.stage === "applied" ? 70 : 45) * 0.3 + 30),
    }));
  const actionItem: EconomyLeverageItem = {
    type: "action",
    label: goalOS.recommendedAction.title,
    potentialImpact: 85,
    difficulty: 35,
    timeRequired: goalOS.recommendedAction.estimatedMinutes,
    outcomeProbability: 70,
    leverageScore: 82,
  };

  return [actionItem, ...projectItems, ...goalItems, ...skillItems].sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 8);
}

export function getPersonalEconomy(state: LearningState) {
  const resources = getPersonalResources(state);
  const allocation = getRecommendedResourceAllocation(state);
  const opportunityCost = getOpportunityCost(state);
  const returnOnEffort = getReturnOnEffort(state);
  const focus = getFocusEngine(state);
  const leverageOpportunities = rankLeverageItems(state);
  const resourceConstraint = getResourceConstraint(resources);
  const energySuggestions = {
    deepWork: allocation.building + allocation.product,
    learning: allocation.learning,
    building: allocation.building,
    recovery: allocation.recovery,
  };
  const topLeverageScore = leverageOpportunities[0]?.leverageScore ?? 0;
  const leverageScore = clampScore(
    topLeverageScore - opportunityCost.opportunityCostScore * 0.25 + returnOnEffort.returnOnEffort * 0.35,
  );

  return {
    resources,
    resourceConstraint,
    allocation,
    opportunityCost,
    returnOnEffort,
    leverageOpportunities,
    focus,
    energySuggestions,
    stopDoing: opportunityCost.stopDoing,
    doubleDown: leverageOpportunities[0]?.label ?? "Create a primary goal",
    mostLeverage: leverageOpportunities[0] ?? null,
    leverageScore,
  };
}
