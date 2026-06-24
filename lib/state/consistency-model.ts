import type { LearningState } from "@/lib/types";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function activityDaysSince(state: LearningState, days: number) {
  const since = daysAgo(days).getTime();
  return new Set(
    state.signals
      .filter((signal) => new Date(signal.occurredAt).getTime() >= since)
      .map((signal) => signal.occurredAt.slice(0, 10)),
  ).size;
}

export function getConsistencyModel(state: LearningState) {
  const daily = activityDaysSince(state, 1);
  const weekly = activityDaysSince(state, 7);
  const monthly = activityDaysSince(state, 30);
  const consistencyScore = Math.min(100, Math.round(daily * 20 + weekly * 8 + monthly * 1.2 + state.streak * 5));

  return {
    daily,
    weekly,
    monthly,
    consistencyScore,
  };
}
