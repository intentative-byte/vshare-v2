import { getCreatorProfiles } from "@/lib/creators/profiles";
import type { CreatorProfile, LearningState } from "@/lib/types";

export type CreatorDiscovery = {
  featured: CreatorProfile[];
  trending: CreatorProfile[];
  rising: CreatorProfile[];
};

export function getCreatorDiscovery(state: LearningState): CreatorDiscovery {
  const creators = getCreatorProfiles(state);
  const followedCreatorIds = new Set(state.followedCreatorIds);
  const recentFollowCounts = new Map<string, number>();

  state.signals
    .filter((signal) => signal.type === "creator_followed" && signal.creatorId)
    .slice(-80)
    .forEach((signal) => recentFollowCounts.set(signal.creatorId!, (recentFollowCounts.get(signal.creatorId!) ?? 0) + 1));

  return {
    featured: creators
      .filter((creator) => !followedCreatorIds.has(creator.id))
      .sort((a, b) => b.learningScore - a.learningScore)
      .slice(0, 4),
    trending: [...creators]
      .sort((a, b) => b.followerCount + (recentFollowCounts.get(b.id) ?? 0) * 20 - (a.followerCount + (recentFollowCounts.get(a.id) ?? 0) * 20))
      .slice(0, 4),
    rising: [...creators].sort((a, b) => b.contentCount * 8 + b.learningScore - (a.contentCount * 8 + a.learningScore)).slice(0, 4),
  };
}
