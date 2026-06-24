import { learningContent } from "@/lib/data";
import { rankFeedContent } from "@/lib/feed-ranking/rank-content";
import type { LearningState } from "@/lib/types";

function asPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getContentHealthMetrics(state: LearningState) {
  const rankedContent = rankFeedContent(state);
  const personalizedItems = rankedContent.filter((item) => item.lane === "personalized");
  const discoveryItems = rankedContent.filter((item) => item.lane === "discovery");
  const totalViews = Object.values(state.contentEngagement).reduce((total, engagement) => total + engagement.views, 0);
  const totalCompletions = Object.values(state.contentEngagement).reduce((total, engagement) => total + engagement.completions, 0);
  const totalSaves = Object.values(state.contentEngagement).reduce((total, engagement) => total + engagement.saves, 0);
  const viewedDiscoveryCount = discoveryItems.filter((item) => state.viewedContentIds.includes(item.content.id)).length;
  const matchingTopContent = rankedContent
    .slice(0, 10)
    .filter((item) => item.content.interests.some((interest) => state.interests.includes(interest))).length;

  return {
    feedRelevanceScore: rankedContent.length
      ? asPercent(rankedContent.slice(0, 8).reduce((total, item) => total + Math.max(0, item.score), 0) / 8)
      : 0,
    contentCompletionRate: totalViews ? asPercent((totalCompletions / totalViews) * 100) : 0,
    saveRate: totalViews ? asPercent((totalSaves / totalViews) * 100) : 0,
    topicAccuracy: rankedContent.length ? asPercent((matchingTopContent / Math.min(10, rankedContent.length)) * 100) : 0,
    discoveryEffectiveness: discoveryItems.length ? asPercent((viewedDiscoveryCount / discoveryItems.length) * 100) : 0,
    personalizedShare: rankedContent.length ? asPercent((personalizedItems.length / rankedContent.length) * 100) : 0,
  };
}

export function getTopicAccuracyByInterest(state: LearningState) {
  return state.interests.map((interest) => {
    const matchingContent = learningContent.filter((content) => content.interests.includes(interest));
    const completedMatchingContent = matchingContent.filter((content) => state.completedContentIds.includes(content.id));

    return {
      interest,
      score: state.interestScores[interest],
      completionRate: matchingContent.length ? asPercent((completedMatchingContent.length / matchingContent.length) * 100) : 0,
    };
  });
}
