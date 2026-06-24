import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { EconomyAllocation, LearningState, UserGoal } from "@/lib/types";

function normalizeAllocation(allocation: EconomyAllocation): EconomyAllocation {
  const total = Object.values(allocation).reduce((sum, value) => sum + value, 0) || 1;

  return Object.fromEntries(
    Object.entries(allocation).map(([key, value]) => [key, Math.round((value / total) * 100)]),
  ) as EconomyAllocation;
}

function isClientOrRevenueGoal(goal: UserGoal | null) {
  const text = `${goal?.title ?? ""} ${goal?.desiredOutcome ?? ""}`.toLowerCase();
  return goal?.type === "business" || text.includes("client") || text.includes("revenue") || text.includes("startup");
}

export function getRecommendedResourceAllocation(state: LearningState): EconomyAllocation {
  const currentGoal = getGoalOperatingSystem(state).currentGoal;

  if (isClientOrRevenueGoal(currentGoal)) {
    return normalizeAllocation({
      learning: 20,
      outreach: 45,
      product: 20,
      building: 5,
      practicing: 5,
      teaching: 0,
      recovery: 5,
    });
  }

  if (currentGoal?.type === "health") {
    return normalizeAllocation({
      learning: 10,
      outreach: 0,
      product: 0,
      building: 10,
      practicing: 45,
      teaching: 0,
      recovery: 35,
    });
  }

  if (currentGoal?.type === "learn" || currentGoal?.type === "career") {
    return normalizeAllocation({
      learning: 35,
      outreach: 10,
      product: 5,
      building: 20,
      practicing: 20,
      teaching: 5,
      recovery: 5,
    });
  }

  return normalizeAllocation({
    learning: 25,
    outreach: 15,
    product: 10,
    building: 25,
    practicing: 15,
    teaching: 5,
    recovery: 5,
  });
}

export function getAllocationAdvice(state: LearningState) {
  const allocation = getRecommendedResourceAllocation(state);
  const largest = Object.entries(allocation).sort(([, a], [, b]) => b - a)[0];

  return {
    allocation,
    recommendation: `Prioritize ${largest[0]} at ${largest[1]}% of available effort.`,
  };
}
