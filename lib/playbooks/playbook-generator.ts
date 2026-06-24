import { extractOutcomeFrameworks } from "@/lib/learning/outcome-extraction";
import type { LearningState } from "@/lib/types";

export type OutcomePlaybook = {
  id: string;
  title: string;
  steps: string[];
  source: string;
};

export function generateOutcomePlaybooks(state: LearningState): OutcomePlaybook[] {
  return extractOutcomeFrameworks(state).map((framework) => ({
    id: `playbook-${framework.id}`,
    title: framework.title,
    steps: framework.steps,
    source: framework.lesson,
  }));
}
