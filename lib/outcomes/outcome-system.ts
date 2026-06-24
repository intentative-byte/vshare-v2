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
  { value: "revenue", label: "Revenue", executionWeight: 30 },
  { value: "clients", label: "Clients", executionWeight: 28 },
  { value: "jobs", label: "Jobs", executionWeight: 30 },
  { value: "promotions", label: "Promotions", executionWeight: 28 },
  { value: "skills", label: "Skills", executionWeight: 20 },
  { value: "fitness", label: "Fitness", executionWeight: 24 },
  { value: "projects", label: "Projects", executionWeight: 24 },
  { value: "education", label: "Education", executionWeight: 22 },
  { value: "salary_increase", label: "Salary Increase", executionWeight: 30 },
  { value: "certification", label: "Certification", executionWeight: 24 },
  { value: "first_client", label: "First Client", executionWeight: 30 },
  { value: "product_launch", label: "Product Launch", executionWeight: 28 },
  { value: "audience_growth", label: "Audience Growth", executionWeight: 22 },
  { value: "skill_acquired", label: "Skill Acquired", executionWeight: 20 },
  { value: "project_completed", label: "Project Completed", executionWeight: 24 },
  { value: "framework_mastered", label: "Framework Mastered", executionWeight: 22 },
  { value: "strength_gain", label: "Strength Gain", executionWeight: 24 },
  { value: "habit_consistency", label: "Habit Consistency", executionWeight: 20 },
  { value: "income_growth", label: "Income Growth", executionWeight: 30 },
  { value: "savings_growth", label: "Savings Growth", executionWeight: 24 },
  { value: "investment_milestone", label: "Investment Milestone", executionWeight: 26 },
];

export function getOutcomeLabel(type: OutcomeType) {
  return outcomeTypes.find((outcome) => outcome.value === type)?.label ?? "Outcome";
}

export function getOutcomeWeight(type: OutcomeType) {
  return outcomeTypes.find((outcome) => outcome.value === type)?.executionWeight ?? 18;
}
