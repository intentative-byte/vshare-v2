import { getOutcomeLabel } from "@/lib/outcomes/outcome-system";
import type { LearningState, UserOutcome } from "@/lib/types";

export type OutcomeLesson = {
  id: string;
  lesson: string;
  sourceOutcomeId: string;
};

function buildLesson(outcome: UserOutcome) {
  const action = outcome.action || outcome.description;
  return `${action} produced ${getOutcomeLabel(outcome.type).toLowerCase()}: ${outcome.title}.`;
}

export function extractOutcomeLessons(state: LearningState): OutcomeLesson[] {
  return state.outcomes.slice(0, 12).map((outcome) => ({
    id: `lesson-${outcome.id}`,
    lesson: buildLesson(outcome),
    sourceOutcomeId: outcome.id,
  }));
}

export function extractOutcomeFrameworks(state: LearningState) {
  return extractOutcomeLessons(state).map((lesson) => ({
    id: `framework-${lesson.sourceOutcomeId}`,
    title: "Repeatable outcome pattern",
    steps: ["Set the target", "Take the action", "Capture evidence", "Review result"],
    lesson: lesson.lesson,
  }));
}
