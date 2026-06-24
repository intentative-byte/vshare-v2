import type { LearningPath, LearningState } from "@/lib/types";

export const learningPaths: LearningPath[] = [
  {
    id: "ai-beginner",
    title: "AI Beginner",
    description: "Understand agents, prompts, and practical AI workflows.",
    primaryInterest: "AI",
    contentIds: ["ai-agent-basics", "ai-prompt-debugging", "technology-api-contracts"],
  },
  {
    id: "ai-builder",
    title: "AI Builder",
    description: "Move from AI concepts to product-quality systems.",
    primaryInterest: "Technology",
    contentIds: ["ai-prompt-debugging", "technology-api-contracts", "entrepreneurship-launch-scope"],
  },
  {
    id: "startup-founder",
    title: "Startup Founder",
    description: "Build customer discovery, pricing, operating rhythm, and launch judgment.",
    primaryInterest: "Entrepreneurship",
    contentIds: [
      "entrepreneurship-customer-calls",
      "business-pricing-signal",
      "business-weekly-review",
      "entrepreneurship-launch-scope",
    ],
  },
  {
    id: "fitness-foundations",
    title: "Fitness Foundations",
    description: "Create a repeatable base for cardio, strength, and practice consistency.",
    primaryInterest: "Fitness",
    contentIds: ["fitness-zone-two", "fitness-strength-template", "music-practice-loop"],
  },
  {
    id: "personal-finance",
    title: "Personal Finance",
    description: "Build runway, understand long-term investing, and improve buying decisions.",
    primaryInterest: "Finance",
    contentIds: ["finance-cash-buffer", "finance-index-funds", "fashion-materials"],
  },
];

export type LearningPathProgress = LearningPath & {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  isFollowed: boolean;
};

export function getLearningPathProgress(state: LearningState): LearningPathProgress[] {
  const completedIds = new Set(state.completedContentIds);
  const followedIds = new Set(state.followedPathIds);

  return learningPaths.map((path) => {
    const completedCount = path.contentIds.filter((contentId) => completedIds.has(contentId)).length;
    const totalCount = path.contentIds.length;

    return {
      ...path,
      completedCount,
      totalCount,
      completionPercentage: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
      isFollowed: followedIds.has(path.id),
    };
  });
}

export function getRecommendedLearningPaths(state: LearningState) {
  return getLearningPathProgress(state).sort((a, b) => {
    const aInterestScore = state.interestScores[a.primaryInterest] ?? 0;
    const bInterestScore = state.interestScores[b.primaryInterest] ?? 0;

    if (a.isFollowed !== b.isFollowed) {
      return a.isFollowed ? -1 : 1;
    }

    return bInterestScore - aInterestScore;
  });
}
