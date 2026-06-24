import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import type { EconomyLeverageItem, LearningState } from "@/lib/types";

export type ScenarioType = "career" | "business" | "learning" | "health" | "financial" | "projects";

export type ScenarioOption = {
  id: string;
  label: string;
  type: ScenarioType;
  source: EconomyLeverageItem;
};

function inferScenarioType(item: EconomyLeverageItem): ScenarioType {
  const normalizedLabel = item.label.toLowerCase();

  if (normalizedLabel.includes("client") || normalizedLabel.includes("revenue") || normalizedLabel.includes("business")) {
    return "business";
  }

  if (normalizedLabel.includes("job") || normalizedLabel.includes("career") || normalizedLabel.includes("manager")) {
    return "career";
  }

  if (normalizedLabel.includes("health") || normalizedLabel.includes("fitness") || normalizedLabel.includes("weight")) {
    return "health";
  }

  if (normalizedLabel.includes("financial") || normalizedLabel.includes("income") || normalizedLabel.includes("savings")) {
    return "financial";
  }

  if (item.type === "project") {
    return "projects";
  }

  return "learning";
}

export function getScenarioOptions(state: LearningState): ScenarioOption[] {
  return getPersonalEconomy(state).leverageOpportunities.slice(0, 3).map((item, index) => ({
    id: `option-${index + 1}`,
    label: item.label,
    type: inferScenarioType(item),
    source: item,
  }));
}
