import { getCreatorProfiles } from "@/lib/creators/profiles";
import type { LearningState } from "@/lib/types";

export function getContentCommunityScore(state: LearningState, contentId: string) {
  const engagement = state.contentEngagement[contentId];

  if (!engagement) {
    return 0;
  }

  return Math.round(
    engagement.likes * 6 +
      engagement.saves * 7 +
      engagement.shares * 9 +
      engagement.completions * 8 +
      engagement.notInterested * -10 +
      engagement.skips * -6,
  );
}

export function getCreatorCommunityStats(state: LearningState, creatorId: string) {
  const creator = getCreatorProfiles(state).find((item) => item.id === creatorId);
  const followsGenerated = state.signals.filter((signal) => signal.type === "creator_followed" && signal.creatorId === creatorId).length;

  return {
    followsGenerated,
    followerCount: creator?.followerCount ?? 0,
    learningScore: creator?.learningScore ?? 0,
  };
}
