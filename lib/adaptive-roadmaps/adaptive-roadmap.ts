import { getGoalOperatingSystem } from "@/lib/goals/goal-operating-system";
import { getRecommendedLearningPaths } from "@/lib/paths/learning-paths";
import type { LearningState } from "@/lib/types";

export function getAdaptiveRoadmap(state: LearningState) {
  const goalOS = getGoalOperatingSystem(state);
  const learningPaths = getRecommendedLearningPaths(state);
  const activeProjects = state.projects.filter((project) => project.status === "active");
  const capabilityTargets = Object.values(state.conceptProgress)
    .filter((progress) => progress.stage !== "mastered")
    .slice(0, 4)
    .map((progress) => `${progress.skill} -> ${progress.stage}`);

  return {
    goals: goalOS.currentGoal ? [`Focus primary goal: ${goalOS.currentGoal.title}`, `Next milestone: ${goalOS.nextMilestone?.label ?? "Define milestone"}`] : ["Create one measurable goal"],
    projects: activeProjects.length ? activeProjects.map((project) => `Advance ${project.title}`) : ["Start one proof project tied to the primary goal"],
    learningPaths: learningPaths.slice(0, 3).map((path) => `${path.title}: ${path.completionPercentage}% complete`),
    capabilities: capabilityTargets.length ? capabilityTargets : ["Apply one learned skill in a real task"],
  };
}
