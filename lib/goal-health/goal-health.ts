import { getGoalProgress, normalizeGoal } from "@/lib/goals/goal-engine";
import { getNextMilestone } from "@/lib/milestones/milestone-engine";
import type { LearningState, UserGoal } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function daysUntil(date: string | null) {
  if (!date) {
    return 180;
  }

  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export function getGoalHealth(goal: UserGoal, state: LearningState) {
  const normalizedGoal = normalizeGoal(goal);
  const progress = getGoalProgress(state, normalizedGoal);
  const recentSignals = state.signals.filter((signal) => new Date(signal.occurredAt).getTime() >= Date.now() - 7 * 86400000).length;
  const relevantOutcomes = state.outcomes.filter((outcome) => outcome.topics.some((topic) => normalizedGoal.topics.includes(topic))).length;
  const daysRemaining = daysUntil(normalizedGoal.deadline);
  const urgencyRisk = daysRemaining < 30 && progress < 50 ? 35 : 0;
  const riskOfFailure = clampScore(100 - progress - recentSignals * 2 - relevantOutcomes * 12 + urgencyRisk);

  return {
    goal: normalizedGoal,
    progress,
    momentum: clampScore(recentSignals * 5 + relevantOutcomes * 18),
    consistency: clampScore(state.streak * 12),
    riskOfFailure,
    nextMilestone: getNextMilestone(normalizedGoal, state),
  };
}

export function getGoalHealthDashboard(state: LearningState) {
  return state.goals.map((goal) => getGoalHealth(goal, state)).sort((a, b) => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityWeight[b.goal.priority] * 100 - b.progress - (priorityWeight[a.goal.priority] * 100 - a.progress);
  });
}
