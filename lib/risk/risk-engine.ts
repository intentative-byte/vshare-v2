import { detectBottlenecks } from "@/lib/bottlenecks/detect-bottlenecks";
import { getPersonalEconomy } from "@/lib/economy/personal-economy";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type SimulationRisk = {
  executionRisk: number;
  knowledgeRisk: number;
  resourceRisk: number;
  focusRisk: number;
  overallRisk: number;
};

export function getSimulationRisk(state: LearningState): SimulationRisk {
  const bottlenecks = detectBottlenecks(state);
  const economy = getPersonalEconomy(state);
  const riskFor = (type: string) => bottlenecks.find((bottleneck) => bottleneck.type === type)?.impact ?? 0;

  const executionRisk = riskFor("execution_bottleneck");
  const knowledgeRisk = riskFor("knowledge_bottleneck");
  const resourceRisk = Math.max(riskFor("resource_bottleneck"), 100 - economy.resources.time, 100 - economy.resources.energy);
  const focusRisk = economy.focus.focusRisk;

  return {
    executionRisk: clampScore(executionRisk),
    knowledgeRisk: clampScore(knowledgeRisk),
    resourceRisk: clampScore(resourceRisk),
    focusRisk: clampScore(focusRisk),
    overallRisk: clampScore((executionRisk + knowledgeRisk + resourceRisk + focusRisk) / 4),
  };
}
