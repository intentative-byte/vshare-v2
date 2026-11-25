/**
 * Admin module — moderation, catalogue operations and governance.
 *
 * Every action re-checks the caller's role on the server and writes an entry
 * to the audit log. Admin routes are never protected by navigation alone.
 *
 * Implemented so far: nothing.
 *
 * Planned public API (docs/VSHARES_API_CONTRACTS.md section 3):
 *   listModerationQueue(input)     Milestone 3
 *   moderateContent(input)         Milestone 3
 *   createCard(input)              Milestone 3
 *   updateCard(input)              Milestone 3
 *   upsertCategory(input)          Milestone 3
 *   upsertTopic(input)             Milestone 3
 *   grantRole(input)               Milestone 3
 *   listReports(input)             Milestone 6
 *   resolveReport(input)           Milestone 6
 *   setFeatureFlag(input)          Milestone 3
 *   activateRankingConfig(input)   Milestone 4
 *   listAuditLog(input)            Milestone 3
 *
 * Reserved for later releases: the wider command centre sections for VAI,
 * creators, retention and operations.
 */
export {};
