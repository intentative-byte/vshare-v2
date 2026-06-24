import type { ContentEngagement, ContentQualityScore, Interest, LearningContent, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function daysSince(date: string) {
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
}

function getEngagementScore(engagement: ContentEngagement | undefined) {
  if (!engagement) {
    return 42;
  }

  const completionRatio = engagement.views ? engagement.completions / engagement.views : 0;
  const saveRatio = engagement.views ? engagement.saves / engagement.views : 0;
  const shareRatio = engagement.views ? engagement.shares / engagement.views : 0;
  const likeRatio = engagement.views ? engagement.likes / engagement.views : 0;
  const replayRatio = engagement.views ? engagement.replays / engagement.views : 0;
  const skipPenalty = engagement.views ? ((engagement.skips + engagement.notInterested * 1.5) / engagement.views) * 30 : 0;

  return clampScore(42 + completionRatio * 26 + saveRatio * 20 + shareRatio * 12 + likeRatio * 14 + replayRatio * 10 - skipPenalty);
}

function getFreshnessScore(content: LearningContent) {
  return clampScore(100 - daysSince(content.createdAt) * 2.2);
}

function getRelevanceScore(content: LearningContent, state: LearningState) {
  if (!content.interests.length) {
    return 0;
  }

  const selectedBoost = content.interests.some((interest) => state.interests.includes(interest)) ? 22 : 0;
  const averageInterestScore =
    content.interests.reduce((total, interest) => total + (state.interestScores[interest] ?? 0), 0) / content.interests.length;

  return clampScore(averageInterestScore + selectedBoost);
}

function getAuthorityScore(sourceAuthorityScore: number, content: LearningContent) {
  const depthBoost = content.level === "deep" ? 6 : content.level === "intermediate" ? 3 : 0;
  const formatBoost = content.format === "article" || content.format === "video" ? 2 : 0;

  return clampScore(sourceAuthorityScore + depthBoost + formatBoost);
}

export function scoreContentQuality(
  content: LearningContent,
  state: LearningState,
  sourceAuthorityScore: number,
): ContentQualityScore {
  const relevanceScore = getRelevanceScore(content, state);
  const engagementScore = getEngagementScore(state.contentEngagement[content.id]);
  const freshnessScore = getFreshnessScore(content);
  const authorityScore = getAuthorityScore(sourceAuthorityScore, content);

  return {
    relevanceScore,
    engagementScore,
    freshnessScore,
    authorityScore,
    overallContentScore: clampScore(
      relevanceScore * 0.38 + engagementScore * 0.24 + freshnessScore * 0.18 + authorityScore * 0.2,
    ),
  };
}

export function getTopicRelevance(contentInterests: Interest[], state: LearningState) {
  if (!contentInterests.length) {
    return 0;
  }

  return clampScore(
    contentInterests.reduce((total, interest) => total + (state.interestScores[interest] ?? 0), 0) / contentInterests.length,
  );
}
