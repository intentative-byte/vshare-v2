/**
 * Content module — the catalogue.
 *
 * Owns categories, topics, value cards and their version history,
 * submissions, moderation and source attribution. The only module that
 * reads or writes catalogue tables.
 *
 * Implemented: database-backed taxonomy, published card reads, submissions,
 * reporting, the moderation queue and moderation actions.
 *
 * Reserved for later releases: content versions already exist, so original
 * creator content and authorised ingestion add rows rather than a second
 * content system.
 */

// Database reads live in ./server, which is server-only. This barrel stays
// safe for a client component to import.

export {
  submitResource,
  reportCard,
  getMySubmissions,
  getModerationQueue,
  moderateCard,
} from "./actions";

export {
  submitResourceInput,
  moderateInput,
  reportInput,
  sourceUrlSchema,
  slugSchema,
  takeawaysSchema,
  type SubmitResourceInput,
} from "./schemas";

export type { Card, CardSummary, CardStatus, Category, Topic } from "./types";

// The approved launch taxonomy. The database is seeded from this, and the
// home page uses it to offer entry points before anyone has signed in.
export {
  categories as seedCategories,
  featuredTopicSlugs,
  findTopic as findSeedTopic,
  allTopics as allSeedTopics,
  findCategory as findSeedCategory,
} from "./taxonomy";
