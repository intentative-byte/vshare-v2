import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import type { LearningState } from "@/lib/types";

export type CapabilityMission = {
  id: "read" | "practice" | "build" | "teach";
  label: string;
  target: string;
  completed: boolean;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getCapabilityMissions(state: LearningState): CapabilityMission[] {
  const today = todayKey();
  const [nextConcept] = getRecommendedNextConcepts(state);
  const completedToday = state.signals.some((signal) => signal.type === "content_completed" && signal.occurredAt.startsWith(today));
  const attemptedToday = Object.values(state.conceptProgress).some(
    (progress) => progress.stage !== "learned" && progress.updatedAt.startsWith(today),
  );
  const builtToday = state.outcomes.some((outcome) => outcome.createdAt.startsWith(today));
  const taughtToday = state.userContributions.some((contribution) => contribution.createdAt.startsWith(today));
  const target = nextConcept ? `${nextConcept.concept} (${nextConcept.topic})` : "your next capability";

  return [
    {
      id: "read",
      label: "Read",
      target: `Learn the next concept: ${target}`,
      completed: completedToday,
    },
    {
      id: "practice",
      label: "Practice",
      target: "Attempt one concept in a real task",
      completed: attemptedToday,
    },
    {
      id: "build",
      label: "Build",
      target: "Log an outcome from applying what you learned",
      completed: builtToday,
    },
    {
      id: "teach",
      label: "Teach",
      target: "Share what you learned as a note or framework",
      completed: taughtToday,
    },
  ];
}
