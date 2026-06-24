import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getGoalDependencies } from "@/lib/dependencies/dependency-engine";
import { getGoalMilestones } from "@/lib/milestones/milestone-engine";
import type { LearningState, UserGoal } from "@/lib/types";

export type GoalRoadmap = {
  goalId: string;
  milestones: string[];
  skillsRequired: string[];
  knowledgeRequired: string[];
  projectsRequired: string[];
  outcomesRequired: string[];
  plan30Days: string[];
  plan90Days: string[];
  plan1Year: string[];
};

export function decomposeGoal(goal: UserGoal, state: LearningState): GoalRoadmap {
  const nextConcepts = getRecommendedNextConcepts(state).filter((concept) => goal.topics.includes(concept.topic));
  const primaryTopic = goal.topics[0] ?? "Other";
  const dependencies = getGoalDependencies(goal);
  const milestones = getGoalMilestones(goal, state);

  return {
    goalId: goal.id,
    milestones: milestones.map((milestone) => milestone.label),
    skillsRequired: Array.from(new Set([...nextConcepts.map((concept) => concept.concept), ...dependencies])).slice(0, 6),
    knowledgeRequired: Array.from(new Set([...goal.topics.map((topic) => `${topic} fundamentals`), ...dependencies.map((item) => `${item} basics`)])).slice(0, 8),
    projectsRequired: [`Create a proof project for ${goal.desiredOutcome}`],
    outcomesRequired: [`Evidence that ${goal.desiredOutcome}`, `A logged result tied to ${primaryTopic}`],
    plan30Days: [
      `Clarify success for ${goal.title}`,
      `Learn ${dependencies[0] ?? `${primaryTopic} fundamentals`}`,
      `Complete one practice session`,
    ],
    plan90Days: [
      `Build a proof project for ${goal.desiredOutcome}`,
      `Get feedback on the project`,
      `Log one evidence-backed outcome`,
    ],
    plan1Year: [
      `Convert ${goal.title} into a repeatable capability`,
      `Teach the framework to someone else`,
      `Stack multiple outcomes toward ${goal.desiredOutcome}`,
    ],
  };
}

export function getGoalRoadmaps(state: LearningState) {
  return state.goals.map((goal) => decomposeGoal(goal, state));
}
