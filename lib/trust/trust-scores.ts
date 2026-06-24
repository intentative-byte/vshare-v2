import { getCapabilityScore } from "@/lib/capability/scoring";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import { getUserReputation } from "@/lib/reputation/reputation-system";
import type { LearningState, TrustScore } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getTrustScore(state: LearningState): TrustScore {
  const capability = getCapabilityScore(state);
  const reputation = getUserReputation(state);

  return {
    learningTrustScore: clampScore(getKnowledgeGrowthScore(state) * 0.6 + state.completedContentIds.length * 4),
    creatorTrustScore: clampScore(reputation.contributionQuality * 0.5 + reputation.teachingQuality * 0.5),
    expertTrustScore: clampScore(capability.executionScore * 0.45 + reputation.outcomeQuality * 0.55),
  };
}

export function getOverallTrustScore(state: LearningState) {
  const trust = getTrustScore(state);

  return clampScore((trust.learningTrustScore + trust.creatorTrustScore + trust.expertTrustScore) / 3);
}
