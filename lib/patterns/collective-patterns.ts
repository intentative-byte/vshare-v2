import { getAnonymizedLearningNetwork } from "@/lib/collective/anonymized-network";
import { getSuccessAnalysis } from "@/lib/outcomes/success-analysis";
import { getRecommendedLearningPaths } from "@/lib/paths/learning-paths";
import type { LearningState } from "@/lib/types";

export type CollectivePattern = {
  label: string;
  signal: string;
  confidence: number;
};

export function getCollectivePatterns(state: LearningState) {
  const network = getAnonymizedLearningNetwork(state);
  const success = getSuccessAnalysis(state);
  const paths = getRecommendedLearningPaths(state);
  const commonSuccessPatterns: CollectivePattern[] = success.worked.map((item, index) => ({
    label: item,
    signal: "Repeated positive outcome pattern",
    confidence: Math.max(45, 85 - index * 8),
  }));
  const commonFailurePatterns: CollectivePattern[] = success.failed.map((item, index) => ({
    label: item,
    signal: "Avoidable failure pattern",
    confidence: Math.max(35, 70 - index * 8),
  }));
  const fastestLearningPaths: CollectivePattern[] = paths.slice(0, 4).map((path) => ({
    label: path.title,
    signal: `${path.completionPercentage}% complete path with ${path.totalCount} resources`,
    confidence: Math.max(40, 80 - path.totalCount * 4),
  }));
  const highestOutcomePaths: CollectivePattern[] = network.outcomes.slice(0, 4).map((outcome) => ({
    label: outcome.type.replaceAll("_", " "),
    signal: `${outcome.count} anonymized outcome signal${outcome.count === 1 ? "" : "s"}`,
    confidence: Math.min(95, 50 + outcome.count * 12),
  }));

  return {
    commonSuccessPatterns,
    commonFailurePatterns,
    fastestLearningPaths,
    highestOutcomePaths,
  };
}
