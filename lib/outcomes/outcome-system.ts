import type { OutcomeType } from "@/lib/types";

export const outcomeTypes: Array<{ value: OutcomeType; label: string; executionWeight: number }> = [
  { value: "built_project", label: "Built Project", executionWeight: 22 },
  { value: "started_business", label: "Started Business", executionWeight: 28 },
  { value: "got_job", label: "Got Job", executionWeight: 30 },
  { value: "passed_exam", label: "Passed Exam", executionWeight: 20 },
  { value: "lost_weight", label: "Lost Weight", executionWeight: 24 },
  { value: "learned_skill", label: "Learned Skill", executionWeight: 18 },
  { value: "earned_revenue", label: "Earned Revenue", executionWeight: 30 },
  { value: "completed_certification", label: "Completed Certification", executionWeight: 24 },
];

export function getOutcomeLabel(type: OutcomeType) {
  return outcomeTypes.find((outcome) => outcome.value === type)?.label ?? "Outcome";
}

export function getOutcomeWeight(type: OutcomeType) {
  return outcomeTypes.find((outcome) => outcome.value === type)?.executionWeight ?? 18;
}
