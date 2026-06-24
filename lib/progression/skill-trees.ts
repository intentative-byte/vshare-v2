import type { LearningState } from "@/lib/types";

export type SkillTreeNode = {
  level: "beginner" | "intermediate" | "advanced";
  skills: string[];
};

export const skillTrees: Record<string, SkillTreeNode[]> = {
  Python: [
    { level: "beginner", skills: ["Variables", "Functions", "Loops"] },
    { level: "intermediate", skills: ["APIs", "Databases"] },
    { level: "advanced", skills: ["Architecture", "Optimisation"] },
  ],
  "AI Builder": [
    { level: "beginner", skills: ["Prompt Engineering", "LLM Basics", "Context Design"] },
    { level: "intermediate", skills: ["Agents", "Tool Use", "Evaluation"] },
    { level: "advanced", skills: ["Fine Tuning", "System Design", "Deployment"] },
  ],
  Founder: [
    { level: "beginner", skills: ["Customer Discovery", "Pricing Strategy", "Positioning"] },
    { level: "intermediate", skills: ["Operations", "Launch", "Sales"] },
    { level: "advanced", skills: ["Hiring", "Revenue Systems", "Leadership"] },
  ],
};

export function getSkillTreeProgress(state: LearningState) {
  const progressValues = Object.values(state.conceptProgress);

  return Object.entries(skillTrees).map(([tree, levels]) => {
    const totalSkills = levels.flatMap((level) => level.skills);
    const masteredCount = totalSkills.filter((skill) =>
      progressValues.some((progress) => progress.skill.toLowerCase().includes(skill.toLowerCase()) && progress.stage === "mastered"),
    ).length;
    const touchedCount = totalSkills.filter((skill) =>
      progressValues.some((progress) => progress.skill.toLowerCase().includes(skill.toLowerCase())),
    ).length;

    return {
      tree,
      levels,
      progressPercentage: Math.round(((masteredCount * 1.4 + touchedCount) / Math.max(1, totalSkills.length * 2.4)) * 100),
    };
  });
}
