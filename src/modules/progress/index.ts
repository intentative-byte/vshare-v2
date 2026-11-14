/**
 * Progress module — interactions, saved library and progress summaries.
 *
 * Owns one interaction record per viewer and card (open, complete, save,
 * like, skip, feedback). Summaries are derived from completion records, so
 * no counter can drift, and opening a card never counts as progress.
 *
 * Implemented so far: nothing.
 *
 * Planned public API (docs/VSHARES_API_CONTRACTS.md section 3):
 *   completeCard(input)            Milestone 5
 *   setSaved(input)                Milestone 5
 *   setLiked(input)                Milestone 5
 *   skipCard(input)                Milestone 5
 *   setFeedback(input)             Milestone 5
 *   listSaved(input)               Milestone 5
 *   listCompleted(input)           Milestone 5
 *   getProgressSummary()           Milestone 5
 *
 * Reserved for later releases: knowledge mastery, activity XP and applied
 * actions are three separate ledgers; this module's completion summary is
 * the activity one and is labelled as such.
 */
export {};
