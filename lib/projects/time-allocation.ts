import type { LearningState, TimeAllocation } from "@/lib/types";

const defaultAllocation: TimeAllocation = {
  learning: 35,
  building: 30,
  practicing: 25,
  teaching: 10,
};

export function normalizeTimeAllocation(allocation: Partial<TimeAllocation> | undefined): TimeAllocation {
  return {
    ...defaultAllocation,
    ...allocation,
  };
}

export function recommendTimeAllocation(state: LearningState): TimeAllocation {
  const hasActiveProject = state.projects.some((project) => project.status === "active");
  const needsEvidence = state.evidence.length < state.outcomes.length;
  const hasSharedRecently = state.userContributions.length > 0;

  return {
    learning: hasActiveProject ? 25 : 40,
    building: hasActiveProject ? 40 : 25,
    practicing: needsEvidence ? 25 : 20,
    teaching: hasSharedRecently ? 10 : 15,
  };
}

export const defaultTimeAllocation = defaultAllocation;
