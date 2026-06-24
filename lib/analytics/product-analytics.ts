import type { LearningState, UserSignal } from "@/lib/types";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isSince(signal: UserSignal, date: Date) {
  return new Date(signal.occurredAt).getTime() >= date.getTime();
}

function uniqueActivityDays(signals: UserSignal[]) {
  return new Set(signals.map((signal) => signal.occurredAt.slice(0, 10)));
}

export function getProductAnalytics(state: LearningState) {
  const lastDaySignals = state.signals.filter((signal) => isSince(signal, daysAgo(1)));
  const lastWeekSignals = state.signals.filter((signal) => isSince(signal, daysAgo(7)));
  const views = state.signals.filter((signal) => signal.type === "content_viewed").length;
  const saves = state.signals.filter((signal) => signal.type === "content_saved").length;
  const sessionSeconds = state.signals
    .filter((signal) => signal.type === "watch_time")
    .reduce((total, signal) => total + Math.max(0, signal.value ?? 0), 0);
  const activeDays = uniqueActivityDays(state.signals).size;

  return {
    dau: uniqueActivityDays(lastDaySignals).size,
    wau: uniqueActivityDays(lastWeekSignals).size,
    contentViews: views,
    saveRate: views ? Math.round((saves / views) * 100) : 0,
    returnRate: activeDays > 1 ? Math.round((Math.min(activeDays, 7) / 7) * 100) : 0,
    averageSessionLengthSeconds: activeDays ? Math.round(sessionSeconds / activeDays) : 0,
  };
}
