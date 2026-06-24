import { ingestContentCatalog } from "@/lib/content/ingestion";
import { localContributorCreatorId } from "@/lib/contributions/normalize";
import type { CreatorProfile, Interest, LearningState } from "@/lib/types";

function usernameFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "creator";
}

function getCreatorBio(name: string, topics: Interest[]) {
  if (name === "You") {
    return "Sharing what you learn with the VShare network.";
  }

  return `Learning source focused on ${topics.slice(0, 2).join(" and ")}.`;
}

export function getCreatorProfiles(state: LearningState): CreatorProfile[] {
  const creators = new Map<string, CreatorProfile>();
  const generatedFollowerCounts = new Map<string, number>();

  state.signals
    .filter((signal) => signal.type === "creator_followed" && signal.creatorId)
    .forEach((signal) => generatedFollowerCounts.set(signal.creatorId!, (generatedFollowerCounts.get(signal.creatorId!) ?? 0) + 1));

  ingestContentCatalog(state).forEach((content) => {
    const existingCreator = creators.get(content.creatorId);
    const topics = Array.from(new Set([...(existingCreator?.topics ?? []), ...content.interests])).slice(0, 4);
    const contentCount = (existingCreator?.contentCount ?? 0) + 1;
    const communityBoost = generatedFollowerCounts.get(content.creatorId) ?? 0;
    const baseFollowerCount = content.creatorId === localContributorCreatorId ? communityBoost : content.source.authorityScore * 11;

    creators.set(content.creatorId, {
      id: content.creatorId,
      name: content.source.name,
      username: content.creatorId === localContributorCreatorId ? "you" : usernameFromName(content.source.name),
      bio: getCreatorBio(content.source.name, topics),
      topics,
      followerCount: Math.round(baseFollowerCount + communityBoost),
      learningScore: Math.min(100, Math.round(content.source.authorityScore * 0.7 + contentCount * 6 + communityBoost * 3)),
      contentCount,
    });
  });

  return Array.from(creators.values()).sort((a, b) => b.learningScore - a.learningScore);
}

export function getCreatorById(state: LearningState, creatorId: string) {
  return getCreatorProfiles(state).find((creator) => creator.id === creatorId) ?? null;
}
