import { getNetworkMatches } from "@/lib/matching/match-engine";
import { getExpertGraph } from "@/lib/network/expert-graph";
import { getKnowledgeNetwork } from "@/lib/network/knowledge-network";
import { getNetworkReputation, getUserReputation } from "@/lib/reputation/reputation-system";
import { getOverallTrustScore, getTrustScore } from "@/lib/trust/trust-scores";
import type { LearningState } from "@/lib/types";

export function getNetworkIntelligence(state: LearningState) {
  return {
    expertGraph: getExpertGraph(state),
    knowledgeNetwork: getKnowledgeNetwork(state),
    matches: getNetworkMatches(state),
    reputation: {
      user: getUserReputation(state),
      creators: getNetworkReputation(state),
    },
    trust: getTrustScore(state),
    overallTrustScore: getOverallTrustScore(state),
  };
}
