import { getMarketGraph } from "@/lib/market/market-graph";
import type { LearningState } from "@/lib/types";

export function getBusinessIntelligence(state: LearningState) {
  const activeTopics = new Set(state.interests.map((interest) => interest.toLowerCase()));
  const relevantMarkets = getMarketGraph().filter((node) => activeTopics.has(node.industry.toLowerCase()));
  const markets = relevantMarkets.length ? relevantMarkets : getMarketGraph().slice(0, 3);

  return {
    markets: markets.map((market) => market.industry),
    products: markets.flatMap((market) => market.businesses).slice(0, 8),
    businessModels: Array.from(new Set(markets.flatMap((market) => market.businesses))).slice(0, 6),
    trends: markets.flatMap((market) => market.trends).slice(0, 8),
  };
}
