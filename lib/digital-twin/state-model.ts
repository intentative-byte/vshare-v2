import type { LearningState } from "@/lib/types";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getKnowledgeGrowthScore } from "@/lib/mastery/scores";

export type UserStateSnapshot = {
  knowledge: number;
  capability: number;
  interests: string[];
  goals: number;
  projects: number;
  skills: number;
  energy: "low" | "steady" | "high";
  consistency: number;
  focus: string;
};

function inferEnergy(state: LearningState): UserStateSnapshot["energy"] {
  const recentSignals = state.signals.slice(-20).length;

  if (recentSignals >= 12) {
    return "high";
  }

  if (recentSignals >= 4) {
    return "steady";
  }

  return "low";
}

export function getCurrentStateSnapshot(state: LearningState): UserStateSnapshot {
  const capability = getCapabilityScore(state);
  const activeProjects = state.projects.filter((project) => project.status === "active");

  return {
    knowledge: getKnowledgeGrowthScore(state),
    capability: capability.capabilityScore,
    interests: state.interests,
    goals: state.goals.length,
    projects: activeProjects.length,
    skills: Object.keys(state.conceptProgress).length,
    energy: inferEnergy(state),
    consistency: Math.min(100, state.streak * 12),
    focus: state.memory.lastActiveTopic ?? state.interests[0] ?? "Choose a focus",
  };
}
