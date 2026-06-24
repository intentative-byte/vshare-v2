import { getTopicKnowledgeScores } from "@/lib/mastery/scores";
import type { CapabilityDimension, LearningState } from "@/lib/types";

export type CapabilityGraphNode = {
  dimension: CapabilityDimension;
  score: number;
  evidenceCount: number;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getCapabilityGraph(state: LearningState): CapabilityGraphNode[] {
  const knowledgeScores = getTopicKnowledgeScores(state);
  const avgAwareness = knowledgeScores.reduce((total, item) => total + item.score.awarenessScore, 0) / knowledgeScores.length;
  const avgUnderstanding = knowledgeScores.reduce((total, item) => total + item.score.understandingScore, 0) / knowledgeScores.length;
  const appliedConcepts = Object.values(state.conceptProgress).filter((progress) =>
    ["applied", "repeated", "mastered"].includes(progress.stage),
  );
  const executedOutcomes = state.outcomes.length;
  const teachingSignals = state.userContributions.length + state.signals.filter((signal) => signal.type === "content_shared").length;

  return [
    {
      dimension: "knowledge",
      score: clampScore(avgAwareness),
      evidenceCount: state.completedContentIds.length,
    },
    {
      dimension: "understanding",
      score: clampScore(avgUnderstanding),
      evidenceCount: state.completedContentIds.length,
    },
    {
      dimension: "application",
      score: clampScore(appliedConcepts.length * 18),
      evidenceCount: appliedConcepts.length,
    },
    {
      dimension: "execution",
      score: clampScore(executedOutcomes * 22),
      evidenceCount: state.outcomes.length,
    },
    {
      dimension: "teaching",
      score: clampScore(teachingSignals * 10),
      evidenceCount: state.userContributions.length,
    },
  ];
}
