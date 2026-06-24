import { applyFeedDiversity } from "@/lib/content/diversity";
import { ingestContentCatalog } from "@/lib/content/ingestion";
import type { Interest, LearningState, NormalizedContent } from "@/lib/types";

export type RankedContent = {
  content: NormalizedContent;
  score: number;
  lane: "personalized" | "discovery";
  reasons: string[];
};

const personalizedBatchSize = 4;
const discoveryBatchSize = 1;

function hoursSince(date: string) {
  const elapsedMs = Date.now() - new Date(date).getTime();
  return Math.max(0, elapsedMs / 36e5);
}

function getContentCompletionRate(state: LearningState, contentId: string) {
  const engagement = state.contentEngagement[contentId];

  if (!engagement?.views) {
    return 0;
  }

  return engagement.completions / engagement.views;
}

function getInterestScore(state: LearningState, interest: Interest) {
  return state.interestScores[interest] ?? 0;
}

function getTopicMatchScore(state: LearningState, content: NormalizedContent) {
  if (!content.interests.length) {
    return 0;
  }

  const directSelectionBoost = content.interests.some((interest) => state.interests.includes(interest)) ? 24 : 0;
  const averageInterestScore =
    content.interests.reduce((total, interest) => total + getInterestScore(state, interest), 0) / content.interests.length;

  return averageInterestScore * 0.72 + directSelectionBoost;
}

function getRecentInterestScore(state: LearningState, content: NormalizedContent) {
  if (!state.memory.lastActiveTopic || !content.interests.includes(state.memory.lastActiveTopic)) {
    return 0;
  }

  return 18;
}

function getRotationScore(state: LearningState, content: NormalizedContent) {
  const engagement = state.contentEngagement[content.id];
  const viewedPenalty = state.viewedContentIds.includes(content.id) ? -35 : 0;
  const completedPenalty = state.completedContentIds.includes(content.id) ? -90 : 0;
  const skippedPenalty = state.skippedContentIds.includes(content.id) ? -80 : 0;
  const notInterestedPenalty = state.notInterestedContentIds.includes(content.id) ? -180 : 0;
  const repeatedViewPenalty = engagement ? Math.max(0, engagement.views - 1) * -10 : 0;
  const newContentBoost = Math.max(0, 24 - hoursSince(content.createdAt) / 24) * 0.9;

  return viewedPenalty + completedPenalty + skippedPenalty + notInterestedPenalty + repeatedViewPenalty + newContentBoost;
}

function scoreContent(state: LearningState, content: NormalizedContent) {
  const engagement = state.contentEngagement[content.id];
  const topicMatch = getTopicMatchScore(state, content);
  const watchHistory = Math.min(20, (engagement?.watchSeconds ?? 0) / 12);
  const saveActivity = state.savedContentIds.includes(content.id) ? 18 : 0;
  const likeActivity = state.likedContentIds.includes(content.id) ? 14 : 0;
  const replayActivity = Math.min(12, (engagement?.replays ?? 0) * 4);
  const completionRate = getContentCompletionRate(state, content.id) * 22;
  const recentInterest = getRecentInterestScore(state, content);
  const rotation = getRotationScore(state, content);
  const contentQuality = content.quality.overallContentScore;

  return topicMatch + watchHistory + saveActivity + likeActivity + replayActivity + completionRate + recentInterest + contentQuality * 0.65 + rotation;
}

function isPersonalized(state: LearningState, content: NormalizedContent) {
  const selectedMatch = content.interests.some((interest) => state.interests.includes(interest));
  const calibratedMatch = content.interests.some((interest) => getInterestScore(state, interest) >= 58);

  return selectedMatch || calibratedMatch;
}

function buildReasons(state: LearningState, content: NormalizedContent, lane: RankedContent["lane"]) {
  const reasons: string[] = [];
  const matchingInterest = content.interests.find((interest) => state.interests.includes(interest));

  if (matchingInterest) {
    reasons.push(`${matchingInterest} match`);
  }

  if (state.memory.lastActiveTopic && content.interests.includes(state.memory.lastActiveTopic)) {
    reasons.push("recent topic");
  }

  if (!state.viewedContentIds.includes(content.id)) {
    reasons.push("unseen");
  }

  if (lane === "discovery") {
    reasons.push("discovery");
  }

  reasons.push(`${content.quality.overallContentScore} quality`);

  return reasons.slice(0, 3);
}

function sortRankedContent(state: LearningState, content: NormalizedContent[], lane: RankedContent["lane"]) {
  return content
    .map((item) => ({
      content: item,
      score: scoreContent(state, item),
      lane,
      reasons: buildReasons(state, item, lane),
    }))
    .sort((a, b) => b.score - a.score);
}

function mixDiscovery(personalized: RankedContent[], discovery: RankedContent[]) {
  const mixedContent: RankedContent[] = [];
  let personalizedIndex = 0;
  let discoveryIndex = 0;

  while (personalizedIndex < personalized.length || discoveryIndex < discovery.length) {
    for (let index = 0; index < personalizedBatchSize && personalizedIndex < personalized.length; index += 1) {
      mixedContent.push(personalized[personalizedIndex]);
      personalizedIndex += 1;
    }

    for (let index = 0; index < discoveryBatchSize && discoveryIndex < discovery.length; index += 1) {
      mixedContent.push(discovery[discoveryIndex]);
      discoveryIndex += 1;
    }
  }

  return mixedContent;
}

export function rankFeedContent(state: LearningState) {
  const normalizedContent = ingestContentCatalog(state);
  const personalized = normalizedContent.filter((content) => isPersonalized(state, content));
  const discovery = normalizedContent.filter((content) => !isPersonalized(state, content));

  if (!state.interests.length) {
    return applyFeedDiversity(sortRankedContent(state, normalizedContent, "discovery"));
  }

  return applyFeedDiversity(
    mixDiscovery(sortRankedContent(state, personalized, "personalized"), sortRankedContent(state, discovery, "discovery")),
  );
}
