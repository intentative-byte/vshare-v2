/**
 * VAI module — ranking, recommendation and explanation.
 *
 * The intelligence layer, built as our own application logic. Ranking is a
 * deterministic weighted score over recorded signals, and every
 * recommendation is logged with the components that produced it so it can be
 * explained to the user and evaluated later.
 *
 * No model provider is wired in. `ModelProvider` is an interface with no
 * implementation: expensive AI services are introduced only on demonstrated
 * need, and never for grading, progress or ranking decisions.
 *
 * Implemented so far: nothing.
 *
 * Planned public API (docs/VSHARES_ARCHITECTURE.md section 6):
 *   rankCandidates(candidates, context)  Milestone 4
 *   buildSession(ranked, options)        Milestone 4
 *   explain(contentId, sessionId)        Milestone 4
 *   getNextBest()                        Milestone 4
 *
 * Reserved for later releases: Next Best Move across learning and applied
 * work, mentor explanations grounded in stored content, explicit memory
 * records, adaptive difficulty, retention signals.
 */

export type { ModelProvider, ModelRequest, ModelResponse } from "./model-provider";
