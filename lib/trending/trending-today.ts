import { ingestContentCatalog } from "@/lib/content/ingestion";
import type { LearningState, NormalizedContent } from "@/lib/types";

export type TrendingItem = {
  content: NormalizedContent;
  trendScore: number;
};

function daysSince(date: string) {
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
}

export function getTrendingToday(state: LearningState): TrendingItem[] {
  return ingestContentCatalog(state)
    .map((content) => {
      const engagement = state.contentEngagement[content.id];
      const freshness = Math.max(0, 30 - daysSince(content.createdAt) * 3);
      const engagementLift = engagement ? engagement.views * 2 + engagement.saves * 6 + engagement.shares * 8 + engagement.likes * 5 : 0;

      return {
        content,
        trendScore: Math.round(content.quality.overallContentScore * 0.55 + freshness + engagementLift),
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 6);
}
