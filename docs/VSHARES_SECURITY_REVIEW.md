# VSHARES — Security review (Milestone 8)

- Date: 2026-11-15
- Scope: the whole MVP, with a focused pass on the Milestone 8 admin interface,
  which is the only new attack surface since the Milestone 7 review in
  `VSHARES_SECURITY.md`.
- Method: run the existing security suites (all pass), then review the new code
  against the directive's §8 checklist. Each item below has a status, the
  evidence, and — where a finding was raised — reproduction, remediation and a
  regression test.

## 1. Findings from this review

Three findings, all low or informational, all addressed in this milestone. No
critical or high findings. No finding blocks release.

### SR-M8-01 — Misleading unused authorship field (informational, fixed)

- **What.** `CardDetail.submittedByMe` was returned by `getCardForAdmin`,
  hardcoded to `false`, and never read. A field named like an authorisation
  signal that is always false and never used invites a future reader to trust
  it as a control.
- **Why it is not a vulnerability.** The high-impact "a reviewer must not be the
  submitter" rule is enforced inside `moderate_content` in the database, from
  `submitted_by` and the acting user, never from this field.
- **Remediation.** Removed the field from the type and the read. The real
  control is untouched and still tested (`120_high_impact.sql`).
- **Regression test.** `230_admin_access.sql` and `120_high_impact.sql` prove
  the DB-side rule; there is nothing to test for a field that no longer exists.

### SR-M8-02 — Staff catalogue writes were unrate-limited (low, fixed)

- **What.** `createCard` and `addCardVersion` had no rate limit. A compromised
  or runaway staff account could create many draft cards or versions.
- **Blast radius.** Low: the output is unpublished drafts, every action is
  audited, and only a moderator or admin can reach it.
- **Remediation.** Added `staffWritePerUser` (300/hour) to both, matching the
  pattern used for user submissions. Generous, because a reviewer clearing a
  backlog is legitimate; it bounds abuse without pacing real work.
- **Regression test.** The pipeline's rate-limit stage is covered by
  `tests/unit/rate-limit.test.ts` and `tests/unit/action.test.ts`; the new rule
  is data consumed by that tested stage.

### SR-M8-03 — Admin id parameter reaches the database as a query value (informational)

- **What.** `/admin/cards/[id]` takes an id from the URL.
- **Review.** It is validated against `/^[0-9a-f-]{36}$/i` before use, passed as
  a parameterised `.eq("id", ...)` (never string-concatenated into SQL), and a
  value the database rejects as a non-uuid is caught and turned into a 404. No
  injection path, no error leak.
- **Action.** None needed. Recorded so the review is complete.

### SR-ADAPT-01 — `app.apply_affinity` was client-executable with a victim-id parameter (high, fixed)

- **What.** `app.apply_affinity(p_user, …)` is a SECURITY DEFINER helper that
  takes a user id and trusts it. PostgreSQL grants EXECUTE to PUBLIC by default,
  and this was never revoked, while `authenticated` holds USAGE on the `app`
  schema. So **any authenticated or anonymous caller could call it directly with
  another account's id and corrupt that account's topic affinity.** Confirmed
  empirically (`has_function_privilege` returned true; a cross-account write
  succeeded) before the fix. It dates to Milestone 4, surfaced by the Milestone
  adaptive security review.
- **Severity.** High — account isolation breach (write to another user's
  personalisation profile). Not a data-disclosure or publication breach.
- **Remediation.** `revoke execute … from public, anon, authenticated`, in the
  pending (unapplied) adaptive migration so no applied migration is rewritten.
  Internal callers are unaffected: `set_interaction` runs as the function owner,
  which keeps EXECUTE, and passes the caller's own id.
- **Regression test.** `250_feedback_security.sql`: the attacker and an
  anonymous visitor are both refused, the victim's profile stays empty, and the
  legitimate `set_interaction` path still updates only the caller's own affinity.

### SR-ADAPT-02 — session feedback was not idempotent (medium, fixed)

- **What.** `record_session_review` nudged format affinity on every call, so
  repeated identical submissions inflated the preference without bound, and an
  edit did not move the evidence correctly.
- **Remediation.** Recompute format affinity from the person's reviews (D-100),
  making resubmission a no-op and edits exact; serialise the recompute per user
  with a transaction advisory lock (D-104). Review eligibility is verified from
  authoritative engagement records — ended AND ≥1 recommended card engaged in
  the session window — not `ended_at` alone (D-103), after the owner found that
  `end_feed_session` sets `ended_at` even for an abandoned, empty session.
- **Regression test.** `250_feedback_security.sql` + `240_session_feedback.sql`:
  not-complete and ended-but-not-engaged rejection, 0/1/6/7-item boundaries,
  abandoned vs completed, stale-interaction isolation, duplicate reviews,
  format edits and clearing, cross-account isolation; plus
  `scripts/test-review-concurrency.mjs` for concurrent submissions.

### Broader SECURITY DEFINER review (2026-11-17)

All 44 SECURITY DEFINER functions were reviewed for execute permission and
ownership checks. Findings: only `app.apply_affinity` was exploitable.
`grant_role`/`revoke_role` check `has_role('admin')` internally;
`merge_guest_into` requires the caller to be the target; every other function
operates on the caller's own rows via `app.current_user_id()` and is gated by
RLS. The policy and security-invoker-view helpers (`app.is_staff`,
`app.can_read_content`, `has_role`, `app.day_of`, `app.suppression_threshold`)
keep client EXECUTE because RLS and views evaluate them as the querying user;
revoking them would break policy evaluation. No other change was required.

## 2. The §8 checklist, item by item

| # | Area | Status | Evidence |
|---|---|---|---|
| 1 | Authentication | **Reviewed; not newly testable** | Magic-link and guest flows are implemented and covered by DB tests; the live auth journeys are on the verification checklist (blocked on a service). No change in M8 |
| 2 | Authorisation | **Pass** | Every admin action declares `access: "admin"` or `"moderator"` in the pipeline **and** the database function re-checks the role. `230_admin_access.sql` proves a moderator cannot manage taxonomy and a learner cannot do anything |
| 3 | Row-level security | **Pass** | 395 DB assertions over 23 files. Every table has RLS; admin reads are RLS-scoped (`createRequestClient`), so a non-admin reading the audit log gets zero rows, not an error or a leak |
| 4 | Role escalation | **Pass** | Roles are granted only by `grant_role`, which is admin-only and audited (`060_roles.sql`). The admin UI exposes no role-granting surface at all |
| 5 | Session handling | **Reviewed** | Sessions are the auth service's; sign-out-everywhere is implemented. Live verification is on the checklist. The admin layout guard is presentation only — the real boundary is the pipeline and RLS |
| 6 | Cross-site scripting | **Pass** | No `dangerouslySetInnerHTML` anywhere (`grep` clean). All admin-entered content renders as text through JSX escaping. `sourceUrl` is shown as **text**, never as an `href`, so a `javascript:` URL cannot execute; the schema also blocks non-https |
| 7 | Cross-site request forgery | **Pass (framework)** | All mutations are Next.js server actions (POST, same-origin action dispatch). No state-changing GET. No change in M8 |
| 8 | Redirect validation | **Pass** | The sign-in redirect sanitiser is unit-tested (17 cases); the admin area adds no new redirects except an internal `router.push` to a card id |
| 9 | Content Security Policy | **Pass** | Per-request nonce CSP in `src/proxy.ts`, tested by `security-headers.spec.ts` (strict, nonce-based, a fresh nonce per response). The admin pages are server-rendered under the same policy |
| 10 | Data leakage | **Pass** | `getCardForAdmin` returns catalogue content and moderation notes (staff-appropriate), and **no personal data** — not the submitter's identity, not an email. The audit view shows only whether an actor was recorded, never who |
| 11 | Logging redaction | **Pass** | The pipeline logs a digest of the account id and an outcome, never input values. `tests/unit/log-privacy.test.ts` (7 tests) drives it with an email, a note and a token and asserts none appears in any line or envelope. Admin actions use the same pipeline |
| 12 | Consent enforcement | **Pass** | Identifier-free aggregates before consent, identified events only after, cleared on withdrawal, gone on deletion — `180_measurement.sql`, `220_analytics_integrity.sql`, and four browser-level checks in `analytics.spec.ts` |
| 13 | Export and deletion abuse | **Pass** | `export_my_data()` takes no argument, so it can only ever describe its caller. `delete_my_account` needs a typed confirmation and a recent sign-in. Both rate-limited. `190_data_rights.sql` (33 assertions) |
| 14 | Dependency and secret scanning | **Pass (prod); tracked (dev)** | `npm audit --omit=dev`: **0**. Full audit: 8 moderate, all in the dev-only lint toolchain (`minimatch` via typescript-eslint), tracked in `VSHARES_SECURITY.md` §7. CI runs gitleaks on full history on every push; it could not run locally here |

## 3. The authorisation model, restated

The admin interface is guarded in **three** independent layers, and the UI is
the weakest of them on purpose:

1. **The layout** (`/admin/layout.tsx`) renders nothing for a non-staff account
   and answers 404 (not 403, per D-045). This is convenience, not security.
2. **The action pipeline** re-checks `access` on every mutation, before the
   handler runs.
3. **The database function** re-checks the role (`has_role('admin')` for
   taxonomy, `app.is_staff()` for cards), and **RLS** re-filters every read.

Defeating the first two still leaves the third: a forged request that reached a
database function directly would be refused by the function and by RLS. This is
what `230_admin_access.sql` exercises — it calls the functions as the wrong
role and watches them refuse.

## 4. What this review could not cover

- **The live auth service.** Session fixation, token handling and the real
  sign-in cannot be exercised without a running service. On the checklist.
- **A manual screen-reader pass.** Automated axe is 0 violations across every
  route and the chart and admin components; a human screen-reader pass is a
  Milestone 8 item that needs a person.
- **An external penetration test.** Recommended before scaling beyond the first
  cohort; out of scope for the MVP and needs budget approval.

## 5. Conclusion

No critical or high-severity finding. The three findings raised are low or
informational and are all fixed in this milestone. The new admin surface is
guarded in depth and its boundary is proven by database tests that call the
functions as the wrong role.

The security *posture* is sound. The security *verification* is not complete,
because the authentication-dependent items cannot be exercised without a live
service — those remain release blockers, listed in the release dashboard.
