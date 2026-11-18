/**
 * Live research & trend-observation layer.
 *
 * Network-capable adapters that take an injected HttpFetcher (so everything is
 * testable offline and deterministically). They respect robots.txt, rate
 * limits and real timestamps, and never fabricate evidence or trend metrics.
 * This layer prepares evidence for human editorial review; it never publishes
 * and never writes to the database.
 */
export { createHttpFetcher, DEFAULT_USER_AGENT, HttpError } from "./http";
export type { HttpFetcher, HttpResponse } from "./http";
export { parseRobots, robotsAllowsPath, checkRobots } from "./robots";
export type { RobotsDecision, RobotsResult } from "./robots";
export { retrieveSource, extractPassages, extractSourceDate } from "./source-adapter";
export type { RetrievalResult, RetrievalStatus, SourceCache, RetrieveOptions } from "./source-adapter";
export { verifyClaims, VERIFY_THRESHOLD } from "./verify";
export type { ClaimVerdict, ClaimVerification, ClaimToVerify } from "./verify";
export { parseFeed, fetchFeed, feedAdapter } from "./trend-adapter";
export type { FeedParseResult, FeedFetchResult } from "./trend-adapter";
export { researchDraft } from "./research";
export type { ResearchedCard } from "./research";
