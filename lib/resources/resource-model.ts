import type { LearningState, PersonalResources } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function recentSignalCount(state: LearningState, days: number) {
  const since = Date.now() - days * 86400000;
  return state.signals.filter((signal) => new Date(signal.occurredAt).getTime() >= since).length;
}

export function getPersonalResources(state: LearningState): PersonalResources {
  const activeGoals = state.goals.length;
  const activeProjects = state.projects.filter((project) => project.status === "active").length;
  const activeSignals = recentSignalCount(state, 7);
  const revenueOutcomes = state.outcomes.filter((outcome) => ["revenue", "earned_revenue", "income_growth"].includes(outcome.type)).length;

  return {
    time: clampScore(70 - activeGoals * 6 - activeProjects * 8 + state.streak * 2),
    energy: clampScore(55 + activeSignals * 3 - activeProjects * 5),
    attention: clampScore(80 - Math.max(0, state.interests.length - 3) * 8 - Math.max(0, activeGoals - 2) * 10),
    focus: clampScore(78 - Math.max(0, activeGoals + activeProjects - 3) * 12),
    money: clampScore(revenueOutcomes * 22 + state.outcomes.filter((outcome) => outcome.type === "clients").length * 18),
  };
}

export function getResourceConstraint(resources: PersonalResources) {
  const entries = Object.entries(resources).sort(([, a], [, b]) => a - b);
  const [resource, score] = entries[0];

  return {
    resource,
    score,
    summary: `${resource} is the tightest current constraint.`,
  };
}
