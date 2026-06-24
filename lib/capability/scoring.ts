import { getCapabilityGraph } from "@/lib/capability/graph";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import type { CapabilityScore, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function getCapabilityScore(state: LearningState): CapabilityScore {
  const graph = getCapabilityGraph(state);
  const dimensionScore = (dimension: string) => graph.find((node) => node.dimension === dimension)?.score ?? 0;
  const learningScore = getKnowledgeGrowthScore(state);
  const applicationScore = dimensionScore("application");
  const executionScore = dimensionScore("execution");
  const evidenceScore = clampScore(state.evidence.length * 16 + state.outcomes.filter((outcome) => outcome.evidenceIds.length > 0).length * 14);
  const capabilityScore = clampScore(learningScore * 0.24 + applicationScore * 0.28 + executionScore * 0.28 + evidenceScore * 0.2);
  const recentOutcomes = state.outcomes.filter((outcome) => new Date(outcome.createdAt).getTime() >= daysAgo(7).getTime()).length;
  const recentAppliedConcepts = Object.values(state.conceptProgress).filter(
    (progress) => new Date(progress.updatedAt).getTime() >= daysAgo(7).getTime() && progress.stage !== "learned",
  ).length;

  return {
    learningScore,
    applicationScore,
    executionScore,
    evidenceScore,
    capabilityScore,
    capabilityDelta: clampScore(recentOutcomes * 18 + recentAppliedConcepts * 8),
  };
}
