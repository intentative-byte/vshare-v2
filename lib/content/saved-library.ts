import { ingestContentCatalog } from "@/lib/content/ingestion";
import type { Interest, LearningState, NormalizedContent } from "@/lib/types";

export type SavedLibraryGroup = {
  topic: Interest;
  items: NormalizedContent[];
};

export function getSavedLibrary(state: LearningState): SavedLibraryGroup[] {
  const savedIds = new Set(state.savedContentIds);
  const groups = new Map<Interest, NormalizedContent[]>();

  ingestContentCatalog(state)
    .filter((content) => savedIds.has(content.id))
    .forEach((content) => {
      const topic = content.interests[0] ?? "Other";
      groups.set(topic, [...(groups.get(topic) ?? []), content]);
    });

  return Array.from(groups.entries())
    .map(([topic, items]) => ({
      topic,
      items: items.sort((a, b) => b.quality.overallContentScore - a.quality.overallContentScore),
    }))
    .sort((a, b) => b.items.length - a.items.length);
}
