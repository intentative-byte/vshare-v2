import { decomposeGoal } from "@/lib/roadmaps/decompose-goal";
import type { LearningState, UserGoal } from "@/lib/types";

export function reasonAboutGoal(goal: UserGoal, state: LearningState) {
  const roadmap = decomposeGoal(goal, state);

  return {
    goal,
    requiredSkills: roadmap.skillsRequired,
    requiredKnowledge: roadmap.knowledgeRequired,
    requiredProjects: roadmap.projectsRequired,
    requiredOutcomes: [`Evidence for ${goal.desiredOutcome}`, `Capability proof in ${goal.topics[0] ?? "core topic"}`],
    roadmap,
  };
}

export function getGoalReasoning(state: LearningState) {
  return state.goals.map((goal) => reasonAboutGoal(goal, state));
}
