import { learningContent } from "@/lib/data";
import type { LearningState, UserSignal } from "@/lib/types";

function asPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isSince(signal: UserSignal, date: Date) {
  return new Date(signal.occurredAt).getTime() >= date.getTime();
}

export function getRetentionMetrics(state: LearningState) {
  const weekStart = daysAgo(7);
  const recentSignals = state.signals.filter((signal) => isSince(signal, weekStart));
  const recentCompletions = recentSignals.filter((signal) => signal.type === "content_completed").length;
  const recentSaves = recentSignals.filter((signal) => signal.type === "content_saved").length;
  const recentViews = recentSignals.filter((signal) => signal.type === "content_viewed").length;
  const activeDays = new Set(recentSignals.map((signal) => signal.occurredAt.slice(0, 10))).size;
  const totalCompletedMinutes = learningContent
    .filter((content) => state.completedContentIds.includes(content.id))
    .reduce((total, content) => total + content.durationMinutes, 0);

  return {
    dailyLearningStreak: state.streak,
    weeklyLearningScore: asPercent(activeDays * 10 + recentCompletions * 12 + recentSaves * 5 + recentViews * 2),
    knowledgeConsistencyScore: asPercent(activeDays * 12 + Math.min(40, totalCompletedMinutes)),
  };
}
