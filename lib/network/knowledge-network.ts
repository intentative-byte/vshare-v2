import { ingestContentCatalog } from "@/lib/content/ingestion";
import { getCreatorProfiles } from "@/lib/creators/profiles";
import type { LearningState } from "@/lib/types";

export type KnowledgeNetworkEdge = {
  from: string;
  to: string;
  type: "user_topic" | "creator_topic" | "topic_skill" | "skill_outcome" | "project_skill";
};

export function getKnowledgeNetwork(state: LearningState) {
  const edges: KnowledgeNetworkEdge[] = [];

  state.interests.forEach((interest) => {
    edges.push({ from: "you", to: interest, type: "user_topic" });
  });

  getCreatorProfiles(state).forEach((creator) => {
    creator.topics.forEach((topic) => edges.push({ from: creator.id, to: topic, type: "creator_topic" }));
    creator.skills.forEach((skill) => edges.push({ from: creator.topics[0] ?? "Other", to: skill, type: "topic_skill" }));
  });

  ingestContentCatalog(state).forEach((content) => {
    edges.push({ from: content.purpose.topic, to: content.purpose.skill, type: "topic_skill" });
  });

  state.outcomes.forEach((outcome) => {
    outcome.topics.forEach((topic) => edges.push({ from: topic, to: outcome.title, type: "skill_outcome" }));
  });

  state.projects.forEach((project) => {
    project.skills.forEach((skill) => edges.push({ from: project.title, to: skill, type: "project_skill" }));
  });

  return {
    nodeCount: new Set(edges.flatMap((edge) => [edge.from, edge.to])).size,
    edges,
  };
}
