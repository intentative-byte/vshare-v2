/**
 * VAI — Value Artificial Intelligence.
 *
 * The intelligence layer, built as our own application logic. In this
 * version VAI is a deterministic recommendation engine, not a generative
 * model: the same inputs always produce the same order, every score breaks
 * down into named components, and every explanation is generated from the
 * components that actually applied.
 *
 * No model provider is wired in and none is needed. `ModelProvider` is an
 * interface with no implementation, so a hosted model can be added later
 * without any feature depending on one.
 *
 * Implemented: the ranker, session assembly and explanations.
 * Planned: Next Best Move across learning and applied work, a grounded
 * mentor, adaptive difficulty, retention signals.
 */

export {
  rankCandidates,
  scoreCandidate,
  declaredInterestComponent,
  learnedAffinityComponent,
  qualityComponent,
  levelFitComponent,
  engagementQualityComponent,
  freshnessComponent,
  timeFitComponent,
  type Candidate,
  type LearnerContext,
  type Level,
  type RankingConfig,
  type RankingParams,
  type RankingWeights,
  type ScoreComponents,
  type ScoredCandidate,
} from "./ranker";

export { assembleSession, type AssembledSession, type SessionItem } from "./session";
export { explain, type Explanation } from "./explain";
export {
  nextBestMove,
  type NextBestFacts,
  type NextBestMove,
  type NextBestRule,
} from "./next-best";
export type { ModelProvider, ModelRequest, ModelResponse } from "./model-provider";
