import { ingestContentCatalog } from "@/lib/content/ingestion";
import { getCreatorProfiles } from "@/lib/creators/profiles";
import { getCreatorReputation } from "@/lib/reputation/reputation-system";
import type { CreatorProfile, LearningState } from "@/lib/types";

export type ExpertGraphNode = CreatorProfile & {
  projects: string[];
  outcomes: string[];
  reputationScore: number;
};

export function getExpertGraph(state: LearningState): ExpertGraphNode[] {
  const contentByCreator = new Map<string, ReturnType<typeof ingestContentCatalog>>();
  const catalog = ingestContentCatalog(state);

  catalog.forEach((content) => {
    contentByCreator.set(content.creatorId, [...(contentByCreator.get(content.creatorId) ?? []), content]);
  });

  return getCreatorProfiles(state).map((creator) => {
    const creatorContent = contentByCreator.get(creator.id) ?? [];
    const reputation = getCreatorReputation(state, creator);

    return {
      ...creator,
      projects: state.projects.filter((project) => project.topics.some((topic) => creator.topics.includes(topic))).map((project) => project.title),
      outcomes: state.outcomes.filter((outcome) => outcome.topics.some((topic) => creator.topics.includes(topic))).map((outcome) => outcome.title),
      skills: Array.from(new Set([...creator.skills, ...creatorContent.map((content) => content.purpose.skill)])).slice(0, 8),
      reputationScore: reputation.reputationScore,
    };
  });
}
