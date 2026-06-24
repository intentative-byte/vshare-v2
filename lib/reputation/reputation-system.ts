import { getCreatorProfiles } from "@/lib/creators/profiles";
import type { CreatorProfile, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type ReputationScore = {
  contributionQuality: number;
  teachingQuality: number;
  outcomeQuality: number;
  reputationScore: number;
};

export function getUserReputation(state: LearningState): ReputationScore {
  const contributionQuality = state.userContributions.length
    ? state.userContributions.reduce((total, contribution) => total + contribution.quality.overallScore, 0) / state.userContributions.length
    : 0;
  const teachingQuality = clampScore(state.userContributions.length * 12 + state.signals.filter((signal) => signal.type === "content_shared").length * 8);
  const outcomeQuality = state.outcomes.length
    ? state.outcomes.reduce((total, outcome) => total + (outcome.evidenceIds.length ? 80 : 48), 0) / state.outcomes.length
    : 0;

  return {
    contributionQuality: clampScore(contributionQuality),
    teachingQuality,
    outcomeQuality: clampScore(outcomeQuality),
    reputationScore: clampScore(contributionQuality * 0.34 + teachingQuality * 0.28 + outcomeQuality * 0.38),
  };
}

export function getCreatorReputation(state: LearningState, creator: CreatorProfile): ReputationScore {
  const isUser = creator.username === "you";

  if (isUser) {
    return getUserReputation(state);
  }

  const contributionQuality = clampScore(creator.learningScore * 0.72 + creator.contentCount * 4);
  const teachingQuality = clampScore(creator.followerCount / 16 + creator.contentCount * 5);
  const outcomeQuality = clampScore(creator.skills.length * 12 + creator.expertise.length * 10);

  return {
    contributionQuality,
    teachingQuality,
    outcomeQuality,
    reputationScore: clampScore(contributionQuality * 0.34 + teachingQuality * 0.28 + outcomeQuality * 0.38),
  };
}

export function getNetworkReputation(state: LearningState) {
  return getCreatorProfiles(state).map((creator) => ({
    creator,
    reputation: getCreatorReputation(state, creator),
  }));
}
