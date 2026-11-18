import "server-only";

/**
 * Server-only reads.
 *
 * `index.ts` is the module's client-safe public API: types, schemas and
 * server actions, all of which a client component may import. Anything that
 * touches the database lives here instead, so a client component that
 * imported the barrel can never drag the database client into the browser
 * bundle.
 */

export {
  listCategories,
  findCategoryWithTopics,
  findPublishedCard,
  findPublishedCardById,
  findTopicBySlug,
  listPublishedCardsByTopic,
  listCategoriesForAdmin,
  listTopicsForAdmin,
  getCardForAdmin,
  listAuditLog,
  listMySubmissions,
  listEditorialReviewItems,
  listEditorialDecisions,
  getEditorialPublicationEligible,
  getEditorialLedgerValid,
  type EditorialReviewItem,
  type EditorialDecisionRecord,
} from "./repository";
