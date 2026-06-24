import { getEvidenceScore } from "@/lib/evidence/evidence-engine";
import { getOutcomeWeight } from "@/lib/outcomes/outcome-system";
import type { LearningState, OutcomeIntelligenceScore, UserOutcome } from "@/lib/types";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type OutcomeTimelineItem = {
  id: string;
  goal: string;
  action: string;
  outcome: string;
  evidenceCount: number;
  createdAt: string;
};

export function getOutcomeTimeline(state: LearningState): OutcomeTimelineItem[] {
  return state.outcomes
    .map((outcome) => ({
      id: outcome.id,
      goal: outcome.goal || outcome.title,
      action: outcome.action || outcome.description,
      outcome: outcome.title,
      evidenceCount: outcome.evidenceIds.length,
      createdAt: outcome.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOutcomeIntelligenceScore(state: LearningState): OutcomeIntelligenceScore {
  const recentOutcomes = state.outcomes.filter((outcome) => new Date(outcome.createdAt).getTime() >= daysAgo(30).getTime());
  const executionScore = clampScore(state.outcomes.reduce((total, outcome) => total + getOutcomeWeight(outcome.type), 0) / 2);
  const outcomeScore = clampScore(
    state.outcomes.reduce((total, outcome) => total + getOutcomeWeight(outcome.type) + outcome.evidenceIds.length * 8, 0) /
      Math.max(1, state.outcomes.length),
  );
  const evidenceScore = getEvidenceScore(state.evidence, state.outcomes);
  const improvementScore = clampScore(recentOutcomes.length * 18 + evidenceScore / 3);

  return {
    executionScore,
    outcomeScore,
    improvementScore,
    outcomeVelocity: clampScore(recentOutcomes.length * 16 + recentOutcomes.filter((outcome) => outcome.evidenceIds.length > 0).length * 10),
  };
}

export function getOutcomeById(state: LearningState, outcomeId: string): UserOutcome | null {
  return state.outcomes.find((outcome) => outcome.id === outcomeId) ?? null;
}
