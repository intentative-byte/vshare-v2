/**
 * Personalisation module — preference memory.
 *
 * Owns what the viewer has told us and what we have learned from their own
 * actions. Everything it stores is visible to them and can be corrected or
 * reset.
 *
 * Implemented: stored preferences (personalisation switch, analytics
 * consent, session length).
 *
 * Planned: declared topics and learned affinity (Milestone 4), the User DNA
 * view (later).
 */

export { getMyPreferences, updatePreferences, readMyPreferences } from "./actions";
export { updatePreferencesInput, type UpdatePreferencesInput } from "./schemas";
export type { Preferences } from "./types";
