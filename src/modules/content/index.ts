/**
 * Content module — the catalogue.
 *
 * Owns categories, topics, value cards, submissions, reports and source
 * attribution. The only module that reads or writes catalogue tables.
 *
 * Implemented so far: the approved taxonomy (served from a typed constant
 * until the database arrives).
 *
 * Planned public API (docs/VSHARES_API_CONTRACTS.md section 3):
 *   listCategoriesWithTopics()      Milestone 3
 *   getCard(slug)                   Milestone 3
 *   listCardsByTopic(slug, cursor)  Milestone 3
 *   searchCards(query, cursor)      Milestone 3
 *   submitResource(input)           Milestone 6
 *   listMySubmissions(cursor)       Milestone 6
 *   reportCard(input)               Milestone 6
 *
 * Reserved for later releases: content versions, media assets, original
 * creator content and authorised ingestion. `content_items.kind` and
 * `origin` already carry the values these need, so they add rows rather than
 * a second content system.
 */

export {
  categories,
  featuredTopicSlugs,
  findCategory,
  findTopic,
  allTopics,
  type Category,
  type Topic,
} from "./taxonomy";
