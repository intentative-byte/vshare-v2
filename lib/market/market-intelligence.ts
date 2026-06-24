import { getBusinessIntelligence } from "@/lib/business-intelligence/business-intelligence";
import { getCareerIntelligence } from "@/lib/career/career-intelligence";
import { getSkillDemandScores } from "@/lib/demand/skill-demand";
import { getMarketGraph } from "@/lib/market/market-graph";
import { getMarketOpportunities } from "@/lib/opportunities/opportunity-engine";
import type { LearningState } from "@/lib/types";

export function getMarketIntelligence(state: LearningState) {
  const career = getCareerIntelligence(state);

  return {
    marketGraph: getMarketGraph(),
    opportunities: getMarketOpportunities(),
    skillDemand: getSkillDemandScores(),
    career,
    business: getBusinessIntelligence(state),
    marketAlignmentScore: career.marketAlignmentScore,
  };
}
