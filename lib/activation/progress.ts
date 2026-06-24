import { getDailyMission } from "@/lib/missions/daily-mission";
import type { LearningState } from "@/lib/types";

export type ActivationStep = {
  id: string;
  label: string;
  completed: boolean;
};

export function getActivationProgress(state: LearningState) {
  const mission = getDailyMission(state);
  const steps: ActivationStep[] = [
    {
      id: "choose-interests",
      label: "Choose interests",
      completed: state.interests.length > 0,
    },
    {
      id: "follow-creators",
      label: "Follow creators",
      completed: state.followedCreatorIds.length > 0,
    },
    {
      id: "save-resource",
      label: "Save first resource",
      completed: state.savedContentIds.length > 0,
    },
    {
      id: "complete-mission",
      label: "Complete first mission",
      completed: mission.completionPercentage === 100,
    },
  ];
  const completedCount = steps.filter((step) => step.completed).length;

  return {
    steps,
    percentage: completedCount === 0 ? 0 : Math.min(100, completedCount * 25),
  };
}
