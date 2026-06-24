import { rankFeedContent, type RankedContent } from "@/lib/feed-ranking/rank-content";
import type { LearningState } from "@/lib/types";

export type FeedStreamItem = RankedContent & {
  streamIndex: number;
  isNew: boolean;
  isUnseen: boolean;
};

function daysSince(date: string) {
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
}

function getMemoryAdjustedScore(state: LearningState, item: RankedContent) {
  const isCompleted = state.completedContentIds.includes(item.content.id);
  const isNotInterested = state.notInterestedContentIds.includes(item.content.id);
  const isViewed = state.viewedContentIds.includes(item.content.id);
  const isNew = daysSince(item.content.createdAt) <= 5;

  return item.score + (isNew ? 18 : 0) + (!isViewed ? 24 : -22) + (isCompleted ? -120 : 0) + (isNotInterested ? -160 : 0);
}

export function buildLearningStream(state: LearningState): FeedStreamItem[] {
  return rankFeedContent(state)
    .filter((item) => !state.notInterestedContentIds.includes(item.content.id))
    .sort((a, b) => getMemoryAdjustedScore(state, b) - getMemoryAdjustedScore(state, a))
    .map((item, streamIndex) => ({
      ...item,
      streamIndex,
      isNew: daysSince(item.content.createdAt) <= 5,
      isUnseen: !state.viewedContentIds.includes(item.content.id),
    }));
}

export function getPrefetchQueue(items: FeedStreamItem[], activeIndex: number, size = 3) {
  return items.slice(activeIndex + 1, activeIndex + 1 + size).map((item) => item.content.id);
}

export function getInitialStreamIndex(state: LearningState, items: FeedStreamItem[]) {
  const lastViewedIndex = items.findIndex((item) => item.content.id === state.memory.lastViewedContentId);

  if (lastViewedIndex === -1) {
    return 0;
  }

  return Math.min(lastViewedIndex + 1, Math.max(0, items.length - 1));
}
