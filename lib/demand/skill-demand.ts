import { getMarketGraph } from "@/lib/market/market-graph";

export type SkillDemandScore = {
  skill: string;
  demand: number;
  competition: number;
  growth: number;
  opportunity: number;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getSkillDemandScores(): SkillDemandScore[] {
  const graph = getMarketGraph();
  const skillCounts = new Map<string, number>();

  graph.forEach((node) => {
    node.skills.forEach((skill) => skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1));
  });

  return Array.from(skillCounts.entries())
    .map(([skill, count]) => {
      const demand = clampScore(45 + count * 18 + (skill.includes("AI") || skill.includes("Agents") ? 18 : 0));
      const competition = clampScore(35 + count * 10 + (skill.includes("Sales") ? 12 : 0));
      const growth = clampScore(50 + (skill.includes("AI") || skill.includes("Automation") || skill.includes("Agents") ? 32 : 12));

      return {
        skill,
        demand,
        competition,
        growth,
        opportunity: clampScore(demand * 0.45 + growth * 0.4 - competition * 0.18),
      };
    })
    .sort((a, b) => b.opportunity - a.opportunity);
}

export function getDemandForSkill(skill: string) {
  return getSkillDemandScores().find((score) => score.skill.toLowerCase() === skill.toLowerCase()) ?? {
    skill,
    demand: 35,
    competition: 30,
    growth: 35,
    opportunity: 35,
  };
}
