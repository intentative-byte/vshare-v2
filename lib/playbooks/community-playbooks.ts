import { getCollectivePatterns } from "@/lib/patterns/collective-patterns";
import { generateOutcomePlaybooks, type OutcomePlaybook } from "@/lib/playbooks/playbook-generator";
import type { LearningState } from "@/lib/types";

export type CommunityPlaybook = OutcomePlaybook & {
  communitySignal: string;
  confidence: number;
};

const defaultPlaybookTemplates = [
  {
    id: "community-get-first-client",
    title: "Get First Client",
    steps: ["Pick a narrow audience", "Practice outreach", "Make ten offers", "Log the outcome"],
  },
  {
    id: "community-learn-ai-faster",
    title: "Learn AI Faster",
    steps: ["Learn one concept", "Apply it in a workflow", "Evaluate output", "Teach the pattern"],
  },
  {
    id: "community-launch-saas",
    title: "Launch SaaS",
    steps: ["Validate pain", "Ship a tiny product", "Talk to users", "Measure revenue signal"],
  },
  {
    id: "community-improve-fitness",
    title: "Improve Fitness",
    steps: ["Choose baseline metric", "Train consistently", "Recover deliberately", "Log proof"],
  },
  {
    id: "community-pass-certification",
    title: "Pass Certification",
    steps: ["Map exam domains", "Practice weak areas", "Simulate exam", "Log result"],
  },
];

export function generateCommunityPlaybooks(state: LearningState): CommunityPlaybook[] {
  const outcomePlaybooks = generateOutcomePlaybooks(state).map((playbook) => ({
    ...playbook,
    communitySignal: "Generated from anonymized outcome lessons",
    confidence: 72,
  }));
  const collectivePatterns = getCollectivePatterns(state);
  const patternPlaybooks = collectivePatterns.highestOutcomePaths.map((pattern) => ({
    id: `community-${pattern.label.toLowerCase().replaceAll(" ", "-")}`,
    title: pattern.label,
    steps: ["Study the proven pattern", "Apply one action", "Capture evidence", "Share the lesson"],
    source: pattern.signal,
    communitySignal: pattern.signal,
    confidence: pattern.confidence,
  }));
  const templatePlaybooks = defaultPlaybookTemplates.map((playbook) => ({
    ...playbook,
    source: "Community baseline playbook",
    communitySignal: "Default collective learning route",
    confidence: 60,
  }));

  return [...outcomePlaybooks, ...patternPlaybooks, ...templatePlaybooks].slice(0, 10);
}
