import { scoreContentQuality } from "@/lib/content/scoring";
import { getContentPurpose } from "@/lib/intelligence/content-purpose";
import type { ContentType, LearningFormat, LearningState, NormalizedContent, UserContribution } from "@/lib/types";

const contributionCreatorId = "vshare-learner";

function contributionTypeToContentType(contribution: UserContribution): ContentType {
  const normalizedUrl = contribution.url?.toLowerCase() ?? "";

  if (normalizedUrl.endsWith(".pdf") || normalizedUrl.includes("arxiv") || normalizedUrl.includes("research")) {
    return "research_paper";
  }

  if (normalizedUrl.includes("youtube") || normalizedUrl.includes("vimeo") || normalizedUrl.includes("video")) {
    return "video";
  }

  const type = contribution.type;

  if (type === "short_insight") {
    return "post";
  }

  if (type === "framework") {
    return "framework";
  }

  if (type === "resource_link") {
    return "article";
  }

  if (type === "article_summary") {
    return "article";
  }

  if (type === "learning_note") {
    return "post";
  }

  return "thread";
}

function contributionTypeToFormat(type: UserContribution["type"]): LearningFormat {
  if (type === "framework" || type === "thread") {
    return "brief";
  }

  if (type === "resource_link" || type === "article_summary") {
    return "article";
  }

  return "brief";
}

export function normalizeContribution(contribution: UserContribution, state: LearningState): NormalizedContent {
  const sourceAuthorityScore = Math.max(48, contribution.quality.overallScore);
  const content = {
    id: contribution.id,
    title: contribution.title,
    summary: contribution.body,
    interests: contribution.topics,
    format: contributionTypeToFormat(contribution.type),
    durationMinutes: Math.max(3, Math.min(18, Math.round(contribution.body.length / 95))),
    level: "starter" as const,
    createdAt: contribution.createdAt,
    sourceLabel: "You",
    media: {
      kind: "text" as const,
      status: "available" as const,
    },
  };

  return {
    ...content,
    contentType: contributionTypeToContentType(contribution),
    source: {
      id: contributionCreatorId,
      name: "You",
      authorityScore: sourceAuthorityScore,
    },
    url: contribution.url,
    publishedAt: contribution.createdAt,
    ingestedAt: contribution.createdAt,
    tags: Array.from(new Set([...contribution.topics, contribution.type])),
    quality: scoreContentQuality(content, state, sourceAuthorityScore),
    purpose: getContentPurpose(content),
    creatorId: contributionCreatorId,
    isUserGenerated: true,
  };
}

export function normalizeContributions(state: LearningState) {
  return state.userContributions.map((contribution) => normalizeContribution(contribution, state));
}

export const localContributorCreatorId = contributionCreatorId;
