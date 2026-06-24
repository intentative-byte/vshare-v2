import { getDailyMission } from "@/lib/missions/daily-mission";
import { getLearningPathProgress } from "@/lib/paths/learning-paths";
import type { LearningState } from "@/lib/types";

export type NotificationIntentType =
  | "daily_mission_reminder"
  | "learning_streak_reminder"
  | "new_content_alert"
  | "path_completion_milestone";

export type NotificationIntent = {
  id: string;
  type: NotificationIntentType;
  title: string;
  body: string;
  priority: "low" | "normal" | "high";
  createdAt: string;
};

export function getNotificationIntents(state: LearningState): NotificationIntent[] {
  const now = new Date().toISOString();
  const mission = getDailyMission(state);
  const followedPaths = getLearningPathProgress(state).filter((path) => path.isFollowed);
  const intents: NotificationIntent[] = [];

  if (mission.completionPercentage < 100) {
    intents.push({
      id: `daily-mission-${mission.date}`,
      type: "daily_mission_reminder",
      title: "Today's mission is waiting",
      body: `${mission.tasks.filter((task) => !task.completed).length} task${
        mission.tasks.filter((task) => !task.completed).length === 1 ? "" : "s"
      } left to complete.`,
      priority: "normal",
      createdAt: now,
    });
  }

  if (state.streak > 0) {
    intents.push({
      id: `streak-${state.streak}`,
      type: "learning_streak_reminder",
      title: "Keep your streak alive",
      body: `You are on a ${state.streak}-day learning streak.`,
      priority: "high",
      createdAt: now,
    });
  }

  followedPaths
    .filter((path) => path.completionPercentage >= 75 && path.completionPercentage < 100)
    .forEach((path) => {
      intents.push({
        id: `path-${path.id}-${path.completionPercentage}`,
        type: "path_completion_milestone",
        title: `${path.title} is almost complete`,
        body: `${path.completionPercentage}% complete. Finish the remaining resources to close the path.`,
        priority: "normal",
        createdAt: now,
      });
    });

  return intents;
}
