/**
 * Analytics module — the event vocabulary and its reports.
 *
 * First-party only: events are written to our own tables, with no
 * third-party collector. Identifiers are never stored for a visitor who has
 * not consented; before consent, counts are aggregate and identifier-free.
 * Every other module records events through track(), and this module imports
 * none of them.
 *
 * Implemented so far: nothing.
 *
 * Planned public API (docs/VSHARES_ARCHITECTURE.md section 7):
 *   track(event)                   Milestone 7
 *   recordClientEvents(batch)      Milestone 7
 *   getFunnelReport(input)         Milestone 7
 *   getValidationMetrics(input)    Milestone 7
 *
 * Reserved for later releases: flow map, Platform Alignment Score,
 * value-leak detection, retention signals.
 */
export {};
