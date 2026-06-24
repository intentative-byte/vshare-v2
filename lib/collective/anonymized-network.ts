import { getCapabilityScore } from "@/lib/capability/scoring";
import type { LearningState } from "@/lib/types";

export type AnonymizedLearningNetwork = {
  skills: Array<{ skill: string; count: number }>;
  projects: Array<{ topic: string; count: number }>;
  outcomes: Array<{ type: string; count: number }>;
  decisions: Array<{ type: string; count: number }>;
  capabilities: {
    averageCapability: number;
    averageExecution: number;
    averageApplication: number;
  };
};

function countValues(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();

  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAnonymizedLearningNetwork(state: LearningState): AnonymizedLearningNetwork {
  const capability = getCapabilityScore(state);
  const skillCounts = countValues(Object.values(state.conceptProgress).map((progress) => progress.skill));
  const projectTopicCounts = countValues(state.projects.flatMap((project) => project.topics));
  const outcomeCounts = countValues(state.outcomes.map((outcome) => outcome.type));
  const decisionCounts = countValues(state.decisions.map((decision) => decision.type));

  return {
    skills: skillCounts.map((item) => ({ skill: item.value, count: item.count })).slice(0, 8),
    projects: projectTopicCounts.map((item) => ({ topic: item.value, count: item.count })).slice(0, 8),
    outcomes: outcomeCounts.map((item) => ({ type: item.value, count: item.count })).slice(0, 8),
    decisions: decisionCounts.map((item) => ({ type: item.value, count: item.count })).slice(0, 8),
    capabilities: {
      averageCapability: capability.capabilityScore,
      averageExecution: capability.executionScore,
      averageApplication: capability.applicationScore,
    },
  };
}
