import { ingestContentCatalog } from "@/lib/content/ingestion";
import type { Interest, LearningState } from "@/lib/types";

export type CreatorProfileFoundation = {
  id: string;
  displayName: string;
  primaryTopics: Interest[];
  followerCount: number;
  contentCount: number;
};

export function getCreatorFoundations(state: LearningState): CreatorProfileFoundation[] {
  const creators = new Map<string, CreatorProfileFoundation>();

  ingestContentCatalog(state).forEach((content) => {
    const existingCreator = creators.get(content.source.id);

    creators.set(content.source.id, {
      id: content.source.id,
      displayName: content.source.name,
      primaryTopics: Array.from(new Set([...(existingCreator?.primaryTopics ?? []), ...content.interests])).slice(0, 3),
      followerCount: existingCreator?.followerCount ?? Math.max(120, content.source.authorityScore * 11),
      contentCount: (existingCreator?.contentCount ?? 0) + 1,
    });
  });

  return Array.from(creators.values());
}
