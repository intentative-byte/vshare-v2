import { getAnonymizedLearningNetwork } from "@/lib/collective/anonymized-network";
import type { LearningState } from "@/lib/types";

export type CapabilityNetworkEdge = {
  from: string;
  to: string;
  weight: number;
};

export function getCapabilityNetwork(state: LearningState) {
  const network = getAnonymizedLearningNetwork(state);
  const edges: CapabilityNetworkEdge[] = [];

  network.skills.forEach((skill) => {
    network.projects.forEach((project) => {
      edges.push({
        from: skill.skill,
        to: project.topic,
        weight: skill.count + project.count,
      });
    });
  });

  network.outcomes.forEach((outcome) => {
    network.skills.slice(0, 4).forEach((skill) => {
      edges.push({
        from: skill.skill,
        to: outcome.type,
        weight: skill.count + outcome.count,
      });
    });
  });

  return {
    skills: network.skills,
    projects: network.projects,
    outcomes: network.outcomes,
    edges: edges.sort((a, b) => b.weight - a.weight).slice(0, 24),
  };
}
