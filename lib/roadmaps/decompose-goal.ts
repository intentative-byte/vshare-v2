import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import type { LearningState, UserGoal } from "@/lib/types";

export type GoalRoadmap = {
  goalId: string;
  milestones: string[];
  skillsRequired: string[];
  knowledgeRequired: string[];
  projectsRequired: string[];
};

export function decomposeGoal(goal: UserGoal, state: LearningState): GoalRoadmap {
  const nextConcepts = getRecommendedNextConcepts(state).filter((concept) => goal.topics.includes(concept.topic));
  const primaryTopic = goal.topics[0] ?? "Other";

  return {
    goalId: goal.id,
    milestones: [
      `Clarify success for ${goal.title}`,
      `Build baseline knowledge in ${primaryTopic}`,
      `Apply one skill in a real project`,
      `Log an outcome with evidence`,
    ],
    skillsRequired: nextConcepts.map((concept) => concept.concept).slice(0, 4),
    knowledgeRequired: goal.topics.map((topic) => `${topic} fundamentals`),
    projectsRequired: [`Create a proof project for ${goal.desiredOutcome}`],
  };
}

export function getGoalRoadmaps(state: LearningState) {
  return state.goals.map((goal) => decomposeGoal(goal, state));
}
