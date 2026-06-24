import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getFocusEngine(state: LearningState) {
  const tooManyGoals = state.goals.length > 3;
  const tooManyProjects = state.projects.filter((project) => project.status === "active").length > 2;
  const tooManyInterests = state.interests.length > 4;
  const focusRisk = clampScore((tooManyGoals ? 35 : 0) + (tooManyProjects ? 35 : 0) + (tooManyInterests ? 20 : 0));
  const recommendations = [
    tooManyGoals ? "Pick one primary goal for the next 30 days." : null,
    tooManyProjects ? "Pause or complete one active project before adding another." : null,
    tooManyInterests ? "Reduce active interests to the few tied to your top goal." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    tooManyGoals,
    tooManyProjects,
    tooManyInterests,
    focusRisk,
    recommendations: recommendations.length ? recommendations : ["Focus load is manageable."],
  };
}
