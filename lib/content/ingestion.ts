import { learningContent } from "@/lib/data";
import { scoreContentQuality } from "@/lib/content/scoring";
import { normalizeContributions } from "@/lib/contributions/normalize";
import type { ContentType, LearningContent, LearningState, NormalizedContent } from "@/lib/types";

type ContentSource = {
  id: string;
  name: string;
  authorityScore: number;
};

const sourceDirectory: Record<string, ContentSource> = {
  "AI systems": { id: "ai-systems", name: "AI Systems", authorityScore: 88 },
  "Prompt practice": { id: "prompt-practice", name: "Prompt Practice", authorityScore: 82 },
  "Business models": { id: "business-models", name: "Business Models", authorityScore: 84 },
  "Operating cadence": { id: "operating-cadence", name: "Operating Cadence", authorityScore: 83 },
  "Money habits": { id: "money-habits", name: "Money Habits", authorityScore: 86 },
  "Investing basics": { id: "investing-basics", name: "Investing Basics", authorityScore: 87 },
  Training: { id: "training", name: "Training", authorityScore: 80 },
  "Strength plan": { id: "strength-plan", name: "Strength Plan", authorityScore: 81 },
  "Scientific literacy": { id: "scientific-literacy", name: "Scientific Literacy", authorityScore: 91 },
  "Space systems": { id: "space-systems", name: "Space Systems", authorityScore: 89 },
  "Software architecture": { id: "software-architecture", name: "Software Architecture", authorityScore: 90 },
  "Digital hygiene": { id: "digital-hygiene", name: "Digital Hygiene", authorityScore: 82 },
  "Style systems": { id: "style-systems", name: "Style Systems", authorityScore: 78 },
  "Buying better": { id: "buying-better", name: "Buying Better", authorityScore: 79 },
  "Listening practice": { id: "listening-practice", name: "Listening Practice", authorityScore: 77 },
  "Practice design": { id: "practice-design", name: "Practice Design", authorityScore: 80 },
  "Customer discovery": { id: "customer-discovery", name: "Customer Discovery", authorityScore: 88 },
  "Launch strategy": { id: "launch-strategy", name: "Launch Strategy", authorityScore: 86 },
  "Learning method": { id: "learning-method", name: "Learning Method", authorityScore: 84 },
  "Knowledge workflow": { id: "knowledge-workflow", name: "Knowledge Workflow", authorityScore: 83 },
};

function inferContentType(content: LearningContent): ContentType {
  if (content.id.includes("framework")) {
    return "framework";
  }

  if (content.id.includes("evidence") || content.id.includes("space")) {
    return "research_paper";
  }

  if (content.format === "video") {
    return "video";
  }

  if (content.format === "audio") {
    return "podcast";
  }

  if (content.format === "challenge") {
    return "tutorial";
  }

  if (content.format === "brief") {
    return "post";
  }

  return "article";
}

function getSource(content: LearningContent): ContentSource {
  return sourceDirectory[content.sourceLabel] ?? {
    id: content.sourceLabel.toLowerCase().replaceAll(" ", "-"),
    name: content.sourceLabel,
    authorityScore: 75,
  };
}

export function normalizeContentItem(content: LearningContent, state: LearningState): NormalizedContent {
  const source = getSource(content);

  return {
    ...content,
    contentType: inferContentType(content),
    source,
    url: null,
    publishedAt: content.createdAt,
    ingestedAt: content.createdAt,
    tags: Array.from(new Set([...content.interests, content.level, content.format])),
    quality: scoreContentQuality(content, state, source.authorityScore),
    creatorId: source.id,
    isUserGenerated: false,
  };
}

export function ingestContentCatalog(state: LearningState): NormalizedContent[] {
  return [...learningContent.map((content) => normalizeContentItem(content, state)), ...normalizeContributions(state)];
}

export function getNormalizedContentById(state: LearningState, contentId: string) {
  return ingestContentCatalog(state).find((content) => content.id === contentId) ?? null;
}
