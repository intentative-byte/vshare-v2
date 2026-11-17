/**
 * Feed module — the Value Feed.
 *
 * Asks the catalogue for eligible cards, asks VAI to rank them, and
 * assembles a finite session that ends with a summary rather than refilling.
 * The platform is not designed to keep anyone scrolling.
 *
 * Implemented: session assembly, impressions, explanations and session
 * summaries.
 *
 * Reserved: sessions that mix lessons, quizzes and reviews alongside value
 * cards, once the learning engine exists.
 */

export {
  getFeedSession,
  recordImpressions,
  whyThis,
  getNextBest,
  endFeedSession,
  recordSessionReview,
} from "./actions";
export type { FeedCard, FeedSession } from "./service";
