import { ingestContentCatalog } from "@/lib/content/ingestion";
import { knowledgeGraph } from "@/lib/knowledge-graph/schema";
import type { Interest, KnowledgeScore, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTopicContentIds(state: LearningState, topic: Interest) {
  return ingestContentCatalog(state)
    .filter((content) => content.purpose.topic === topic || content.interests.includes(topic))
    .map((content) => content.id);
}

export type TopicKnowledgeScore = {
  topic: Interest;
  score: KnowledgeScore;
};

export function getTopicKnowledgeScores(state: LearningState): TopicKnowledgeScore[] {
  return knowledgeGraph.map((topicNode) => {
    const topicContentIds = getTopicContentIds(state, topicNode.id);
    const viewedCount = topicContentIds.filter((contentId) => state.viewedContentIds.includes(contentId)).length;
    const completedCount = topicContentIds.filter((contentId) => state.completedContentIds.includes(contentId)).length;
    const revisitedCount = topicContentIds.filter((contentId) => (state.contentEngagement[contentId]?.replays ?? 0) > 0).length;
    const appliedCount = state.userContributions.filter((contribution) => contribution.topics.includes(topicNode.id)).length;
    const total = Math.max(1, topicContentIds.length);

    return {
      topic: topicNode.id,
      score: {
        awarenessScore: clampScore((viewedCount / total) * 100),
        understandingScore: clampScore((completedCount / total) * 100),
        applicationScore: clampScore((appliedCount / Math.max(1, Math.ceil(total / 3))) * 100),
        masteryScore: clampScore(((completedCount + revisitedCount + appliedCount * 1.4) / (total + 2)) * 100),
      },
    };
  });
}

export function getKnowledgeGrowthScore(state: LearningState) {
  const scores = getTopicKnowledgeScores(state);
  const selectedScores = scores.filter((score) => state.interests.includes(score.topic));
  const activeScores = selectedScores.length ? selectedScores : scores;

  return clampScore(activeScores.reduce((total, item) => total + item.score.masteryScore, 0) / activeScores.length);
}
