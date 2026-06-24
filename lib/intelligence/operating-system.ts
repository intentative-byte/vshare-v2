import { getLearningGaps, getRecommendedNextConcepts } from "@/lib/gaps/gap-engine";
import { knowledgeGraph } from "@/lib/knowledge-graph/schema";
import { getLearningJourneys } from "@/lib/intelligence/journeys";
import { getPersonalLearningMap } from "@/lib/intelligence/learning-map";
import { getKnowledgeRetentionScores } from "@/lib/mastery/retention";
import { getKnowledgeGrowthScore, getTopicKnowledgeScores } from "@/lib/mastery/scores";
import { getVaiGuidance } from "@/lib/vai/modes";
import type { LearningState } from "@/lib/types";

export function getLearningOperatingSystem(state: LearningState) {
  return {
    knowledgeGraph,
    topicKnowledgeScores: getTopicKnowledgeScores(state),
    learningGaps: getLearningGaps(state),
    recommendedNextConcepts: getRecommendedNextConcepts(state),
    learningJourneys: getLearningJourneys(state),
    retentionScores: getKnowledgeRetentionScores(state),
    personalLearningMap: getPersonalLearningMap(state),
    vaiGuidance: getVaiGuidance(state),
    knowledgeGrowthScore: getKnowledgeGrowthScore(state),
  };
}
