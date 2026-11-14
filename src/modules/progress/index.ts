/**
 * Progress module — interactions, the saved library and progress summaries.
 *
 * Opening a card and completing it are separate facts. Summaries are
 * derived from completion records only, so no counter can drift and time
 * spent on a page is never mistaken for learning.
 *
 * Implemented: interactions, saved library, completion-based summary.
 *
 * Reserved: knowledge mastery and applied actions are separate ledgers; the
 * summary here is the activity one and is labelled as such.
 */

export {
  setInteraction,
  listSaved,
  getProgressSummary,
  type InteractionState,
} from "./actions";
