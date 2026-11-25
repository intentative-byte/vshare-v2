import "server-only";

export {
  buildSession,
  firstWinCard,
  buildNextBestMove,
  explainRecommendation,
  finishSession,
  loadActiveConfig,
} from "./service";

// Approved-media reads (Phase 10.5A): RLS-gated, missing-schema safe.
export { listApprovedMedia, type ApprovedMediaRow } from "./repository";
export { isMissingMediaTableError } from "./media-errors";
