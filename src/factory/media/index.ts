/**
 * Multimedia Knowledge Engine — public surface.
 *
 * Provider-independent, embed-only (nothing downloaded or rehosted), local-first
 * and read-only. Prepares candidates for human editorial review and the VAI
 * ranker; it never publishes or writes to the database.
 */
export * from "./types";
export { parseProviderUrl, isValidProviderId, canonicalUrl, buildEmbed } from "./providers";
export type { ParsedProviderUrl, EmbedOptions } from "./providers";
export { verifyCandidate } from "./verify";
export { runMediaPipeline, assessQuality, assessSafety } from "./pipeline";
export type { MediaPipelineResult, MediaPipelineOptions } from "./pipeline";
export { rankMedia, toRankerCandidate, MEDIA_RANKING_CONFIG } from "./rank";
export type { RankedMedia } from "./rank";
export { verifyViaOEmbed } from "./oembed";
export type { OEmbedResult, OEmbedStatus } from "./oembed";
export { renderPrototype } from "./prototype";
export type { PrototypeOptions } from "./prototype";
