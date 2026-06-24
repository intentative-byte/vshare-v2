import type { Interest } from "@/lib/types";

export type KnowledgeSkill = {
  id: string;
  label: string;
};

export type KnowledgeSubtopic = {
  id: string;
  label: string;
  skills: KnowledgeSkill[];
};

export type KnowledgeTopic = {
  id: Interest;
  label: Interest;
  subtopics: KnowledgeSubtopic[];
};

export const knowledgeGraph: KnowledgeTopic[] = [
  {
    id: "AI",
    label: "AI",
    subtopics: [
      { id: "llms", label: "LLMs", skills: [{ id: "context-windows", label: "Context Windows" }] },
      { id: "agents", label: "Agents", skills: [{ id: "tool-use", label: "Tool Use" }] },
      { id: "prompt-engineering", label: "Prompt Engineering", skills: [{ id: "prompt-debugging", label: "Prompt Debugging" }] },
      { id: "fine-tuning", label: "Fine Tuning", skills: [{ id: "model-adaptation", label: "Model Adaptation" }] },
    ],
  },
  {
    id: "Business",
    label: "Business",
    subtopics: [
      { id: "sales", label: "Sales", skills: [{ id: "buyer-signals", label: "Buyer Signals" }] },
      { id: "marketing", label: "Marketing", skills: [{ id: "positioning", label: "Positioning" }] },
      { id: "operations", label: "Operations", skills: [{ id: "weekly-review", label: "Weekly Review" }] },
      { id: "leadership", label: "Leadership", skills: [{ id: "decision-rhythm", label: "Decision Rhythm" }] },
    ],
  },
  {
    id: "Finance",
    label: "Finance",
    subtopics: [
      { id: "budgeting", label: "Budgeting", skills: [{ id: "runway-planning", label: "Runway Planning" }] },
      { id: "investing", label: "Investing", skills: [{ id: "index-funds", label: "Index Funds" }] },
    ],
  },
  {
    id: "Fitness",
    label: "Fitness",
    subtopics: [
      { id: "cardio", label: "Cardio", skills: [{ id: "zone-two", label: "Zone 2 Training" }] },
      { id: "strength", label: "Strength", skills: [{ id: "progressive-overload", label: "Progressive Overload" }] },
    ],
  },
  {
    id: "Science",
    label: "Science",
    subtopics: [
      { id: "evidence", label: "Evidence", skills: [{ id: "study-quality", label: "Study Quality" }] },
      { id: "systems", label: "Systems", skills: [{ id: "space-weather", label: "Space Weather" }] },
    ],
  },
  {
    id: "Technology",
    label: "Technology",
    subtopics: [
      { id: "architecture", label: "Architecture", skills: [{ id: "api-contracts", label: "API Contracts" }] },
      { id: "privacy", label: "Privacy", skills: [{ id: "permission-review", label: "Permission Review" }] },
    ],
  },
  {
    id: "Fashion",
    label: "Fashion",
    subtopics: [
      { id: "style-systems", label: "Style Systems", skills: [{ id: "capsule-wardrobe", label: "Capsule Wardrobe" }] },
      { id: "materials", label: "Materials", skills: [{ id: "fabric-quality", label: "Fabric Quality" }] },
    ],
  },
  {
    id: "Music",
    label: "Music",
    subtopics: [
      { id: "listening", label: "Listening", skills: [{ id: "arrangement", label: "Arrangement" }] },
      { id: "practice", label: "Practice", skills: [{ id: "practice-loops", label: "Practice Loops" }] },
    ],
  },
  {
    id: "Entrepreneurship",
    label: "Entrepreneurship",
    subtopics: [
      { id: "customer-discovery", label: "Customer Discovery", skills: [{ id: "question-design", label: "Question Design" }] },
      { id: "launch", label: "Launch", skills: [{ id: "scope-control", label: "Scope Control" }] },
    ],
  },
  {
    id: "Other",
    label: "Other",
    subtopics: [
      { id: "learning-methods", label: "Learning Methods", skills: [{ id: "topic-mapping", label: "Topic Mapping" }] },
      { id: "knowledge-workflow", label: "Knowledge Workflow", skills: [{ id: "note-review", label: "Note Review" }] },
    ],
  },
];

export function getKnowledgeTopic(topic: Interest) {
  return knowledgeGraph.find((node) => node.id === topic) ?? knowledgeGraph[knowledgeGraph.length - 1];
}
