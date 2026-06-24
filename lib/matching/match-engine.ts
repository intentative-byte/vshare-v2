import { ingestContentCatalog } from "@/lib/content/ingestion";
import { getExpertGraph } from "@/lib/network/expert-graph";
import { getRecommendedLearningPaths } from "@/lib/paths/learning-paths";
import type { LearningState } from "@/lib/types";

function overlapScore(a: string[], b: string[]) {
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item)).length;
}

export function getNetworkMatches(state: LearningState) {
  const interests = state.interests;
  const completedIds = new Set(state.completedContentIds);
  const people = getExpertGraph(state)
    .filter((expert) => expert.username !== "you")
    .map((expert) => ({
      expert,
      score: overlapScore(expert.topics, interests) * 18 + expert.reputationScore + expert.skills.length * 3,
      reason: `${overlapScore(expert.topics, interests)} topic overlap · ${expert.skills.slice(0, 2).join(", ")}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const resources = ingestContentCatalog(state)
    .filter((content) => !completedIds.has(content.id))
    .map((content) => ({
      content,
      score: overlapScore(content.interests, interests) * 22 + content.quality.overallContentScore,
      reason: `Teaches ${content.purpose.skill}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const paths = getRecommendedLearningPaths(state)
    .map((path) => ({
      path,
      score: (state.interestScores[path.primaryInterest] ?? 0) + (path.isFollowed ? 20 : 0),
      reason: `${path.completionPercentage}% complete · ${path.primaryInterest}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const projects = state.projects
    .filter((project) => project.status === "active")
    .map((project) => ({
      project,
      score: overlapScore(project.topics, interests) * 25 + project.skills.length * 8,
      reason: `${project.skills.slice(0, 3).join(", ") || "Build proof"}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    people,
    resources,
    paths,
    projects,
  };
}
