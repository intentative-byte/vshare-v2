import type { ContentPurpose, LearningContent } from "@/lib/types";

function inferSkill(content: LearningContent) {
  const normalizedTitle = content.title.toLowerCase();

  if (normalizedTitle.includes("prompt")) {
    return "Prompt Engineering";
  }

  if (normalizedTitle.includes("agent")) {
    return "Agents";
  }

  if (normalizedTitle.includes("pricing")) {
    return "Pricing Strategy";
  }

  if (normalizedTitle.includes("customer")) {
    return "Customer Discovery";
  }

  if (normalizedTitle.includes("cash") || normalizedTitle.includes("fund")) {
    return "Financial Planning";
  }

  if (normalizedTitle.includes("training") || normalizedTitle.includes("strength")) {
    return "Training Consistency";
  }

  if (normalizedTitle.includes("evidence") || normalizedTitle.includes("scientific")) {
    return "Evidence Evaluation";
  }

  if (normalizedTitle.includes("api") || normalizedTitle.includes("privacy")) {
    return "Technical Judgment";
  }

  return `${content.interests[0] ?? "General"} Foundations`;
}

function inferOutcome(content: LearningContent, skill: string) {
  if (content.format === "challenge") {
    return `Apply ${skill} in a small practice session.`;
  }

  if (content.format === "video" || content.media.kind === "video") {
    return `Recognize the key moves behind ${skill}.`;
  }

  if (content.format === "audio") {
    return `Build intuition for ${skill} through listening.`;
  }

  return `Explain and use the core idea behind ${skill}.`;
}

export function getContentPurpose(content: LearningContent): ContentPurpose {
  const skill = inferSkill(content);

  return {
    skill,
    difficulty: content.level === "deep" ? "advanced" : content.level === "intermediate" ? "intermediate" : "beginner",
    topic: content.interests[0] ?? "Other",
    outcome: inferOutcome(content, skill),
  };
}
