/**
 * VSHARES Content Factory & TAI — public surface.
 *
 * Pure, local-first, deterministic. No database, no network, no publishing.
 * Prepares drafts + evidence for the existing human editorial workflow
 * (moderate_content through the database gates), which this module never calls.
 */
export * from "./types";
export { verifySource, classifyHost, credibilityWeight } from "./sources";
export { normalizeUrl, titleSimilarity, detectDuplicate, NEAR_DUPLICATE_THRESHOLD } from "./dedup";
export { buildEvidence, checkClaims } from "./evidence";
export { classifySafety, HIGH_IMPACT_CATEGORIES, HIGH_IMPACT_TOPICS } from "./safety";
export { grade, FIELD_LIMITS } from "./rubric";
export { runPipeline } from "./pipeline";
export type { PipelineRunResult } from "./pipeline";
export {
  normalizeTerm,
  normalizeTrends,
  clusterTrends,
  computeMomentum,
  classifyTrend,
  assessCredibility,
  proposeTrend,
  runTai,
  TAI_DEFAULTS,
} from "./tai";
export type { TaiOptions, TaiReport, ClassifyRule } from "./tai";
export { planCurriculum } from "./planner";
export type { PlanOptions } from "./planner";
