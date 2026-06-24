import { getAnonymizedLearningNetwork } from "@/lib/collective/anonymized-network";
import { getCapabilityNetwork } from "@/lib/community-intelligence/capability-network";
import { generateCommunityPlaybooks } from "@/lib/playbooks/community-playbooks";
import { getCollectivePatterns } from "@/lib/patterns/collective-patterns";
import type { LearningState } from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getCollectiveIntelligence(state: LearningState) {
  const anonymizedNetwork = getAnonymizedLearningNetwork(state);
  const patterns = getCollectivePatterns(state);
  const playbooks = generateCommunityPlaybooks(state);
  const capabilityNetwork = getCapabilityNetwork(state);
  const collectiveLearningGain = clampScore(
    anonymizedNetwork.skills.length * 6 +
      anonymizedNetwork.outcomes.length * 8 +
      patterns.commonSuccessPatterns.length * 8 +
      playbooks.length * 4,
  );

  return {
    anonymizedNetwork,
    patterns,
    playbooks,
    capabilityNetwork,
    collectiveLearningGain,
    provenPath: patterns.highestOutcomePaths[0]?.label ?? playbooks[0]?.title ?? "Log outcomes to create proven paths",
    successfulBehavior: patterns.commonSuccessPatterns[0]?.label ?? "Apply, measure, and share what worked",
    superiorRoute: playbooks[0]?.title ?? "Complete one community playbook",
  };
}
