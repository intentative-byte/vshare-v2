import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import type { LearningState } from "@/lib/types";

export function getHighestImpactActivities(state: LearningState) {
  return getPersonalEconomy(state).leverageOpportunities.slice(0, 5).map((item) => ({
    activity: item.label,
    type: item.type,
    impact: item.potentialImpact,
    leverageScore: item.leverageScore,
    reason: `${item.label} has ${item.outcomeProbability}% outcome probability with ${item.timeRequired}% time load.`,
  }));
}
