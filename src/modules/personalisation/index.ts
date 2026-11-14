/**
 * Personalisation module — declared interests and preference memory.
 *
 * Owns the user's chosen topics, the affinity learned from their own
 * interactions, their level per topic and the personalisation switch.
 * Everything it stores is visible to the user and can be corrected or reset.
 *
 * Implemented so far: nothing.
 *
 * Planned public API (docs/VSHARES_API_CONTRACTS.md section 3):
 *   getPreferenceMemory()          Milestone 4
 *   setTopics(input)               Milestone 4
 *   setTopicLevel(input)           Milestone 4
 *   resetLearnedPreferences(input) Milestone 4
 *   updatePreferences(input)       Milestone 4
 *   getLearnerProfile()            Milestone 4, consumed by vai
 *
 * Reserved for later releases: User DNA adds skills, pace, formats and gaps
 * to getLearnerProfile() without changing its callers.
 */
export {};
