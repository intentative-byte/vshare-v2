import { getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { getTopicKnowledgeScores, getKnowledgeGrowthScore } from "@/lib/mastery/scores";
import type { LearningState } from "@/lib/types";

export function getPersonalLearningMap(state: LearningState) {
  const scores = getTopicKnowledgeScores(state)
    .filter((score) => !state.interests.length || state.interests.includes(score.topic))
    .sort((a, b) => b.score.masteryScore - a.score.masteryScore);
  const current = scores[0];
  const target = scores.find((score) => score.score.masteryScore < 70) ?? scores[scores.length - 1];
  const nextConcepts = getRecommendedNextConcepts(state);

  return {
    currentPosition: current
      ? `${current.topic}: ${current.score.masteryScore}% mastery`
      : "Choose interests to start your learning map.",
    targetPosition: target ? `${target.topic}: 70% mastery` : "Maintain and apply your strongest topics.",
    suggestedRoute: nextConcepts.map((concept) => `${concept.topic} -> ${concept.concept}`),
    knowledgeGrowthScore: getKnowledgeGrowthScore(state),
  };
}
