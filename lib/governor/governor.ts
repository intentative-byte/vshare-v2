import { getAdaptiveRoadmap } from "@/lib/adaptive-roadmaps/adaptive-roadmap";
import { getAdaptiveGovernance } from "@/lib/governance/adaptive-governance";
import { getLifeOperatingSystem } from "@/lib/life-os/life-operating-system";
import type { LearningState } from "@/lib/types";

export function getGovernorEngine(state: LearningState) {
  const governance = getAdaptiveGovernance(state);
  const lifeOS = getLifeOperatingSystem(state);
  const roadmap = getAdaptiveRoadmap(state);
  const urgentCorrection = governance.find((signal) => signal.severity >= 60);

  return {
    mode: urgentCorrection ? "protect" : "compound",
    command: urgentCorrection?.correction ?? lifeOS.operator.command,
    protectionReason: urgentCorrection ? `${urgentCorrection.type} threatens long-term growth.` : "System is stable enough to compound.",
    roadmap,
    protectsLongTermGrowth: !urgentCorrection,
  };
}
