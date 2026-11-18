/**
 * The AI model boundary.
 *
 * VAI is our own intelligence layer. A hosted model is an optional,
 * replaceable detail behind this interface, so no feature depends on a
 * provider and none is needed for the first release.
 *
 * Rules that outlive any provider choice:
 *   - A model never grades an assessment, awards progress or decides a rank.
 *   - A model never asserts a fact that is not in stored, published content.
 *   - Every call is metered, with per-user and global budgets.
 *
 * No adapter exists yet, by design (decision in docs/VSHARES_DECISIONS.md).
 */

export type ModelRequest = {
  /** Which product feature is asking, for metering and budgets. */
  feature: string;
  /** Instructions for the model. */
  system: string;
  /** The user-visible question or text. */
  prompt: string;
  /** Passages retrieved from our own published content, for grounding. */
  grounding: Array<{ contentId: string; title: string; text: string }>;
  maxOutputTokens: number;
};

export type ModelResponse = {
  text: string;
  /** Content items the answer relied on, for display as sources. */
  citedContentIds: string[];
  usage: { inputTokens: number; outputTokens: number };
};

export type ModelProvider = {
  readonly name: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
};
