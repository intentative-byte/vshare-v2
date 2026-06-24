import { getCapabilityScore } from "@/lib/capability/scoring";
import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getTopicKnowledgeScores } from "@/lib/mastery/scores";
import type { LearningState } from "@/lib/types";

export function getCurrentPosition(state: LearningState) {
  const capability = getCapabilityScore(state);
  const strongestKnowledge = getTopicKnowledgeScores(state)
    .sort((a, b) => b.score.masteryScore - a.score.masteryScore)
    .slice(0, 3);
  const activeProjects = state.projects.filter((project) => project.status === "active");
  const [topGap] = getRecommendedNextConcepts(state);

  return {
    knows: strongestKnowledge.map((item) => `${item.topic} (${item.score.masteryScore}% mastery)`),
    canDo: Object.values(state.conceptProgress)
      .filter((progress) => ["applied", "repeated", "mastered"].includes(progress.stage))
      .slice(0, 5)
      .map((progress) => `${progress.skill} (${progress.stage})`),
    workingOn: activeProjects.map((project) => project.title),
    strugglingWith: topGap ? [`${topGap.concept} in ${topGap.topic}`] : ["No clear gap detected"],
    capabilityScore: capability.capabilityScore,
  };
}
