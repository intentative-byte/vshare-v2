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
 * What each metric means. These definitions are shown to the owner in the
 * admin reports, so a number is never read as something it is not.
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
    "Seconds from arriving to completing a first card, reported by the browser. A product benchmark, not a claim about how long learning takes.",
  session_completed: "A session was worked through to its summary.",
  account_created: "A guest account became a registered one.",
  return_visit_with_completion:
    "Someone came back on a later day and completed at least one card.",
};
