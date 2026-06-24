import { getCapabilityScore } from "@/lib/capability/scoring";
import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getGoalProgress } from "@/lib/goals/goal-engine";
import type { Bottleneck, LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function detectBottlenecks(state: LearningState): Bottleneck[] {
  const capability = getCapabilityScore(state);
  const gaps = getRecommendedNextConcepts(state);
  const averageGoalProgress = state.goals.length
    ? state.goals.reduce((total, goal) => total + getGoalProgress(state, goal), 0) / state.goals.length
    : 0;
  const activeProjects = state.projects.filter((project) => project.status === "active").length;
  const unresolvedDecisions = state.decisions.filter((decision) => !decision.outcome).length;
  const bottlenecks: Bottleneck[] = [
    {
      type: "knowledge_bottleneck",
      label: "Knowledge bottleneck",
      impact: clampScore(gaps.length * 18 + (100 - capability.learningScore) * 0.45),
      reason: gaps[0] ? `Next missing concept: ${gaps[0].concept} in ${gaps[0].topic}.` : "Knowledge gaps are low.",
    },
    {
      type: "skill_bottleneck",
      label: "Skill bottleneck",
      impact: clampScore(100 - capability.applicationScore),
      reason: "Application score trails learned concepts.",
    },
    {
      type: "execution_bottleneck",
      label: "Execution bottleneck",
      impact: clampScore(100 - capability.executionScore + activeProjects * 6),
      reason: activeProjects ? "Active projects need shipped outcomes." : "Execution evidence is limited.",
    },
    {
      type: "consistency_bottleneck",
      label: "Consistency bottleneck",
      impact: clampScore(70 - state.streak * 10),
      reason: state.streak > 0 ? `${state.streak}-day streak is forming.` : "No active streak yet.",
    },
    {
      type: "resource_bottleneck",
      label: "Resource bottleneck",
      impact: clampScore(unresolvedDecisions * 18 + (100 - averageGoalProgress) * 0.25),
      reason: unresolvedDecisions ? "Open decisions are slowing progress." : "Goals need clearer leverage resources.",
    },
  ];

  return bottlenecks.sort((a, b) => b.impact - a.impact);
}
