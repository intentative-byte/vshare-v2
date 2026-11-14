/**
 * The event vocabulary.
 *
 * The same list exists in the database (`app.is_known_event`). Anything not
 * on it is refused there, so a typo cannot quietly create a metric nobody
 * defined, and every name here has a written definition.
 */

export const eventNames = [
  "visit_started",
  "topic_selected",
  "first_card_shown",
  "card_opened",
  "card_completed",
  "card_saved",
  "card_skipped",
  "first_completion_seconds",
  "session_completed",
  "account_created",
  "return_visit_with_completion",
] as const;

export type EventName = (typeof eventNames)[number];

/**
 * What each event means.
 *
 * These are *reported* events: a browser said so, and nothing can verify it.
 * The numbers the dashboard leads with are derived from the product tables
 * instead — see ./metrics.ts and docs/VSHARES_METRICS_DICTIONARY.md.
 */
export const eventDefinitions: Record<EventName, string> = {
  visit_started: "Someone loaded a page of the application for the first time in a browser session.",
  topic_selected: "Someone chose a topic, from the home page or from Explore.",
  first_card_shown: "A value card was shown to someone who has never completed one.",
  card_opened: "A card was opened to read. This is not progress and never counts as learning.",
  card_completed: "Someone marked a card as taken in. This is the only thing counted as learning.",
  card_saved: "A card was added to the saved library.",
  card_skipped: "A card was skipped in a session.",
  first_completion_seconds:
    "Superseded in Milestone 7 and no longer written. The browser now reports a first-win time through its own action, which the database records once per account, so a reload cannot report a second and faster first win. The name is kept because events recorded under it still exist.",
  session_completed: "A session was worked through to its summary.",
  account_created: "A guest account became a registered one.",
  return_visit_with_completion:
    "Someone came back on a later day and completed at least one card.",
};
