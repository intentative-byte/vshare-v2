import { getCapabilityGraph } from "@/lib/capability/graph";
import { getCapabilityScore } from "@/lib/capability/scoring";
import { getCapabilityMissions } from "@/lib/missions/capability-missions";
import { getCapabilityTimeline } from "@/lib/progression/timeline";
import { getSkillTreeProgress } from "@/lib/progression/skill-trees";
import type { LearningState } from "@/lib/types";

export function getCapabilityOperatingSystem(state: LearningState) {
  return {
    graph: getCapabilityGraph(state),
    score: getCapabilityScore(state),
    missions: getCapabilityMissions(state),
    skillTrees: getSkillTreeProgress(state),
    timeline: getCapabilityTimeline(state),
    founderDashboard: {
      knowledgeGrowth: getCapabilityScore(state).learningScore,
      capabilityGrowth: getCapabilityScore(state).capabilityScore,
      executionGrowth: getCapabilityScore(state).executionScore,
    },
  };
}
