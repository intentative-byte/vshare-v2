import type { ConceptActionStage, ConceptProgress, Interest, LearningState, NormalizedContent } from "@/lib/types";

const stageOrder: ConceptActionStage[] = ["learned", "attempted", "applied", "repeated", "mastered"];

function getNextStage(current: ConceptActionStage, incoming: ConceptActionStage) {
  return stageOrder[Math.max(stageOrder.indexOf(current), stageOrder.indexOf(incoming))];
}

export function updateConceptProgress(
  state: LearningState,
  content: NormalizedContent,
  incomingStage: ConceptActionStage,
): Record<string, ConceptProgress> {
  const key = `${content.purpose.topic}:${content.purpose.skill}`;
  const existing = state.conceptProgress[key];
  const nextStage = existing ? getNextStage(existing.stage, incomingStage) : incomingStage;
  const repetitions = existing?.repetitions ?? 0;

  return {
    ...state.conceptProgress,
    [key]: {
      skill: content.purpose.skill,
      topic: content.purpose.topic,
      stage: nextStage,
      repetitions: incomingStage === "repeated" ? repetitions + 1 : repetitions,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function updateConceptProgressForOutcome(
  state: LearningState,
  topic: Interest,
  skill: string,
  incomingStage: ConceptActionStage,
): Record<string, ConceptProgress> {
  const key = `${topic}:${skill}`;
  const existing = state.conceptProgress[key];
  const nextStage = existing ? getNextStage(existing.stage, incomingStage) : incomingStage;

  return {
    ...state.conceptProgress,
    [key]: {
      skill,
      topic,
      stage: nextStage,
      repetitions: existing?.repetitions ?? 0,
      updatedAt: new Date().toISOString(),
    },
  };
}
