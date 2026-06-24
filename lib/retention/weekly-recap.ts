import { learningContent } from "@/lib/data";
import type { Interest, LearningState, UserSignal } from "@/lib/types";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isRecent(signal: UserSignal) {
  return new Date(signal.occurredAt).getTime() >= daysAgo(7).getTime();
}

export function getWeeklyRecap(state: LearningState) {
  const recentSignals = state.signals.filter(isRecent);
  const viewedIds = new Set(
    recentSignals.filter((signal) => signal.type === "content_viewed" && signal.contentId).map((signal) => signal.contentId),
  );
  const savedIds = new Set(
    recentSignals.filter((signal) => signal.type === "content_saved" && signal.contentId).map((signal) => signal.contentId),
  );
  const topicsLearned = new Set<Interest>();

  learningContent
    .filter((content) => viewedIds.has(content.id) || state.completedContentIds.includes(content.id))
    .forEach((content) => content.interests.forEach((interest) => topicsLearned.add(interest)));

  return {
    resourcesViewed: viewedIds.size,
    resourcesSaved: savedIds.size,
    topicsLearned: Array.from(topicsLearned),
    streakProgress: state.streak,
    growthSummary:
      topicsLearned.size > 0
        ? `You built momentum across ${topicsLearned.size} topic${topicsLearned.size === 1 ? "" : "s"} this week.`
        : "Start viewing and completing resources to build this week's recap.",
  };
}
