/**
 * Analytics module — measurement, consent first.
 *
 * Aggregate counts hold no identifier and are recorded for everyone.
 * Identified events are written only where consent has been granted, and
 * are deleted when it is withdrawn. Every module records through track();
 * this module imports none of them.
 *
 * Implemented: the event vocabulary and its definitions, recording,
 * consent, and the first-learning-win funnel.
 *
 * Reserved: the flow map, Platform Alignment Score and value-leak detection.
 */

export { track, setAnalyticsConsent, getFirstWinMetrics } from "./actions";
export { eventNames, eventDefinitions, type EventName } from "./events";
