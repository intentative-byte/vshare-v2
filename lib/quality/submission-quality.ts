import type { Interest, LearningState, SubmissionQualityScore, UserContribution } from "@/lib/types";

const minimumSubmissionQuality = 42;
const duplicateWindow = 20;
const maxSubmissionsPerHour = 5;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function recentContributionCount(state: LearningState) {
  const oneHourAgo = Date.now() - 3600000;
  return state.userContributions.filter((contribution) => new Date(contribution.createdAt).getTime() >= oneHourAgo).length;
}

export function isDuplicateContribution(state: LearningState, title: string, url: string | null) {
  const normalizedTitle = normalizeText(title);
  const normalizedUrl = url?.trim().toLowerCase() ?? null;

  return state.userContributions.slice(-duplicateWindow).some((contribution) => {
    return normalizeText(contribution.title) === normalizedTitle || Boolean(normalizedUrl && contribution.url?.toLowerCase() === normalizedUrl);
  });
}

export function isRateLimited(state: LearningState) {
  return recentContributionCount(state) >= maxSubmissionsPerHour;
}

export function scoreSubmissionQuality(input: {
  title: string;
  body: string;
  topics: Interest[];
  state: LearningState;
}): SubmissionQualityScore {
  const titleLength = input.title.trim().length;
  const bodyLength = input.body.trim().length;
  const hasClearTitle = titleLength >= 8 && titleLength <= 100;
  const hasUsefulBody = bodyLength >= 30 && bodyLength <= 1200;
  const hasTopics = input.topics.length > 0;
  const qualityScore = clampScore((hasClearTitle ? 32 : 8) + (hasUsefulBody ? 42 : Math.min(22, bodyLength / 4)) + (hasTopics ? 18 : 0));
  const topicMatchScore = input.topics.length
    ? clampScore(input.topics.reduce((total, topic) => total + (input.state.interestScores[topic] ?? 0), 0) / input.topics.length)
    : 0;
  const communityScore = clampScore(55 + input.state.savedContentIds.length * 2 + input.state.completedContentIds.length * 2);

  return {
    qualityScore,
    topicMatchScore,
    communityScore,
    overallScore: clampScore(qualityScore * 0.55 + topicMatchScore * 0.25 + communityScore * 0.2),
  };
}

export function passesMinimumQuality(quality: SubmissionQualityScore) {
  return quality.overallScore >= minimumSubmissionQuality;
}

export function getContributionQualityLabel(contribution: UserContribution) {
  if (contribution.quality.overallScore >= 78) {
    return "High quality";
  }

  if (contribution.quality.overallScore >= minimumSubmissionQuality) {
    return "Approved";
  }

  return "Downgraded";
}
