import { knowledgeGraph } from "@/lib/knowledge-graph/schema";
import { getTopicKnowledgeScores } from "@/lib/mastery/scores";
import type { Interest, LearningState } from "@/lib/types";

export type LearningGap = {
  topic: Interest;
  status: "known" | "partial" | "needs_next";
  concept: string;
  reason: string;
};

export function getLearningGaps(state: LearningState) {
  const scoresByTopic = new Map(getTopicKnowledgeScores(state).map((score) => [score.topic, score.score]));
  const gaps: LearningGap[] = [];

  knowledgeGraph
    .filter((topic) => !state.interests.length || state.interests.includes(topic.id))
    .forEach((topic) => {
      const score = scoresByTopic.get(topic.id);
      const status =
        (score?.masteryScore ?? 0) >= 70 ? "known" : (score?.understandingScore ?? 0) >= 30 ? "partial" : "needs_next";
      const nextSubtopic =
        topic.subtopics.find((subtopic) => {
          const subtopicSignals = state.signals.filter((signal) => signal.topic === topic.id && signal.query?.includes(subtopic.label));
          return subtopicSignals.length === 0;
        }) ?? topic.subtopics[0];

      gaps.push({
        topic: topic.id,
        status,
        concept: nextSubtopic.label,
        reason:
          status === "known"
            ? "Ready for application or advanced practice."
            : status === "partial"
              ? "Build understanding into application."
              : "Start here to establish awareness.",
      });
    });

  return gaps;
}

export function getRecommendedNextConcepts(state: LearningState) {
  return getLearningGaps(state)
    .filter((gap) => gap.status !== "known")
    .slice(0, 5);
}
