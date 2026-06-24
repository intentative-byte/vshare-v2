import { knowledgeGraph } from "@/lib/knowledge-graph/schema";
import { getTopicKnowledgeScores } from "@/lib/mastery/scores";
import type { Interest, LearningState } from "@/lib/types";

export type LearningJourney = {
  level: "beginner" | "intermediate" | "advanced";
  topic: Interest;
  steps: string[];
  readinessScore: number;
};

export function getLearningJourneys(state: LearningState): LearningJourney[] {
  const scoresByTopic = new Map(getTopicKnowledgeScores(state).map((score) => [score.topic, score.score]));
  const topics = knowledgeGraph.filter((topic) => !state.interests.length || state.interests.includes(topic.id));

  return topics.flatMap((topic) => {
    const score = scoresByTopic.get(topic.id);
    const subtopics = topic.subtopics.map((subtopic) => subtopic.label);

    return [
      {
        level: "beginner" as const,
        topic: topic.id,
        steps: subtopics.slice(0, 2),
        readinessScore: Math.max(0, 100 - (score?.awarenessScore ?? 0)),
      },
      {
        level: "intermediate" as const,
        topic: topic.id,
        steps: subtopics.slice(1, 4),
        readinessScore: score?.understandingScore ?? 0,
      },
      {
        level: "advanced" as const,
        topic: topic.id,
        steps: [...subtopics.slice(-2), "Apply through contribution"],
        readinessScore: score?.applicationScore ?? 0,
      },
    ];
  });
}
