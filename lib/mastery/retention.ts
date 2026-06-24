import { ingestContentCatalog } from "@/lib/content/ingestion";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getKnowledgeRetentionScores(state: LearningState) {
  return ingestContentCatalog(state)
    .filter((content) => state.viewedContentIds.includes(content.id) || state.completedContentIds.includes(content.id))
    .map((content) => {
      const engagement = state.contentEngagement[content.id];
      const completed = state.completedContentIds.includes(content.id);
      const revisited = (engagement?.replays ?? 0) > 0;
      const applied = state.userContributions.some((contribution) => contribution.topics.includes(content.purpose.topic));

      return {
        contentId: content.id,
        title: content.title,
        topic: content.purpose.topic,
        retentionScore: clampScore((completed ? 42 : 14) + (revisited ? 28 : 0) + (applied ? 30 : 0)),
      };
    })
    .sort((a, b) => b.retentionScore - a.retentionScore);
}
