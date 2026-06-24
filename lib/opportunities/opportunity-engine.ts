import { getSkillDemandScores } from "@/lib/demand/skill-demand";
import { getMarketGraph } from "@/lib/market/market-graph";

export function getMarketOpportunities() {
  const demandScores = getSkillDemandScores();
  const graph = getMarketGraph();

  return {
    emergingSkills: demandScores.filter((score) => score.growth >= 70).slice(0, 6),
    growingMarkets: graph
      .map((node) => ({
        industry: node.industry,
        trends: node.trends,
        growthScore: node.trends.some((trend) => trend.toLowerCase().includes("ai")) ? 88 : 68,
      }))
      .sort((a, b) => b.growthScore - a.growthScore),
    highDemandCapabilities: demandScores.filter((score) => score.demand >= 70).slice(0, 6),
  };
}
