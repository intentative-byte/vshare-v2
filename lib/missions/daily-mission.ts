import { learningContent } from "@/lib/data";
import type { LearningState } from "@/lib/types";

export type MissionTask = {
  id: string;
  label: string;
  target: number;
  current: number;
  completed: boolean;
};

export type DailyMission = {
  date: string;
  title: string;
  tasks: MissionTask[];
  completionPercentage: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function signalsToday(state: LearningState, type: string) {
  const today = todayKey();
  return state.signals.filter((signal) => signal.type === type && signal.occurredAt.startsWith(today)).length;
}

export function getDailyMission(state: LearningState): DailyMission {
  const today = todayKey();
  const completedArticleCount = learningContent.filter(
    (content) =>
      content.format === "article" &&
      state.completedContentIds.includes(content.id) &&
      state.signals.some(
        (signal) => signal.type === "content_completed" && signal.contentId === content.id && signal.occurredAt.startsWith(today),
      ),
  ).length;
  const watchedLessonCount = state.signals.filter(
    (signal) => signal.type === "watch_time" && signal.occurredAt.startsWith(today) && (signal.value ?? 0) >= 30,
  ).length;
  const savedCount = signalsToday(state, "content_saved");
  const sharedCount = signalsToday(state, "content_shared");
  const tasks: MissionTask[] = [
    {
      id: "read-article",
      label: "Read 1 article",
      target: 1,
      current: Math.min(1, completedArticleCount),
      completed: completedArticleCount >= 1,
    },
    {
      id: "watch-lesson",
      label: "Watch 1 lesson",
      target: 1,
      current: Math.min(1, watchedLessonCount),
      completed: watchedLessonCount >= 1,
    },
    {
      id: "save-resource",
      label: "Save 1 resource",
      target: 1,
      current: Math.min(1, savedCount),
      completed: savedCount >= 1,
    },
    {
      id: "share-insight",
      label: "Share 1 insight",
      target: 1,
      current: Math.min(1, sharedCount),
      completed: sharedCount >= 1,
    },
  ];
  const completionPercentage = Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);

  return {
    date: today,
    title: "Today's Mission",
    tasks,
    completionPercentage,
  };
}
