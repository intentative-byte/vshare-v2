import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import type { LearningState } from "@/lib/types";

export function getStrategicRoadmap(state: LearningState) {
  const goalOS = getGoalOperatingSystem(state);
  const roadmap = goalOS.roadmaps[0];

  return {
    milestones: roadmap?.milestones ?? ["Set a primary goal", "Define first milestone", "Log first outcome"],
    projects: roadmap?.projectsRequired ?? ["Create one proof project"],
    capabilities: roadmap?.skillsRequired ?? ["Apply one skill in the real world"],
    outcomes: roadmap?.outcomesRequired ?? ["Log one measurable outcome"],
  };
}
