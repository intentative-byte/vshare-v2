# VSHARES — Release-readiness dashboard

- Date: 2026-11-15 · Milestone 8 + Live Integration stage
- **Status: NOT READY FOR PRODUCTION.** Mandatory live verification is blocked
  on a service that does not yet exist, and one release blocker (source links /
  launch catalogue) remains open. This is the honest single view the directive
  (§12) asks for. Every previously skipped check stays visible here until it is
  resolved.
- Legend: **Pass** (verified) · **Blocked** (cannot verify here; needs a live
  service, network, or a person) · **Open** (real work remaining) · **Not run**.

## 0. The one-line recommendation

**Do not release.** The application is built, internally consistent and passes
every check that can run without a live service (192 unit, 395 database, 90
end-to-end, 0 axe violations, a clean backup/restore drill, 0 production
dependency advisories), and is now proven to apply and run against a
Supabase-shaped database (§1a). It cannot be declared production-ready because the
62-plus authentication-dependent journeys have never run against a real
service, full account erasure is unverified end to end, and no catalogue card
can be published until its source link is checked. See §1 for what unblocks it.

## 1. Release blockers (must be cleared before go-live)

| # | Blocker | Status | Severity | Owner | Remediation | Retest |
|---|---|---|---|---|---|---|
| B1 | A live Supabase/auth environment (D17) | **Blocked** | Critical | Owner | Create a free dev project; share URL + anon key only, never service-role | Unblocks B2–B4 |
| B2 | 62 live-service end-to-end checks never run | **Blocked** on B1 | Critical | Claude, then owner review | Run `VSHARES_LIVE_VERIFICATION.md` in order; record each result | After B1 |
| B3 | Full account erasure unverified end to end | **Blocked** on B1 | Critical | Claude | Verify `delete_my_account` through a real sign-in across all account types (§6) | After B1 |
| B4 | 60-second first-win benchmark never measured | **Blocked** on B1 | High | Claude | Measure the real journey; report observed time + sample size (§10) | After B1 |
| B5 | Source links unchecked → no card can publish | **Open** | Critical | Owner + Claude | Run the link checker where the web is reachable; owner editorial sign-off of the first 10 | Then publish |
| B6 | Launch catalogue not published | **Open** (depends on B5) | High | Owner | Approve house style; prepare the rest incl. Productivity | After B5 |
| B7 | Admin catalogue/taxonomy interface | **Resolved this milestone** | — | Claude | Built, DB-tested; live admin journeys are in B2 | — |

## 1a. Live-integration connection readiness (new)

Before a project exists, the question is: *will the app actually apply and run
against a Supabase-shaped database?* Proven by applying the real migrations and
seeds to a PostgreSQL database with a real `auth.users`, the three Supabase
roles, and **no test harness** — the honest standalone test.

| Check | Status | Evidence |
|---|---|---|
| All 7 migrations apply standalone (no harness) | **Pass** | `npm run apply:project` against the Supabase-shaped DB, all ok |
| Both seed files apply | **Pass** | 8 categories, 40 topics, 10 cards |
| Seeded cards are drafts, none publishable | **Pass** | 10 draft, 0 published |
| Signup trigger creates profile + preferences | **Pass** | Insert into `auth.users` → profile `newuser` + preferences appear |
| Migrations grant table access to `authenticated`/`anon` | **Pass** | 47 grants in the migrations themselves, not the test-only file |
| RLS reads work with request claims | **Pass** | Read as `authenticated` with a claims sub respects policies |
| `apply:project` refuses a local test DB | **Pass** | Safety guard verified |
| `bootstrap:staff` grants a role by email, idempotent, fails loudly on a typo | **Pass** | All three paths tested |
| Setup guide covers the 11-point §1 checklist | **Pass** | `VSHARES_SUPABASE_SETUP.md` |

**What this means.** The application is *ready to connect*. What is still
blocked is not the app's readiness but the existence of a project running the
HTTP auth (GoTrue) and data (PostgREST) services — which `@supabase/supabase-js`
talks to, and which need either a hosted project or a container runtime. The
schema layer is proven; the service layer is not reachable here.

## 2. Functional requirements

| Requirement | Evidence | Status | Severity | Remediation / Retest |
|---|---|---|---|---|
| Magic-link authentication | DB signup trigger tested; live journey `auth-live.spec.ts` | **Blocked** | Critical | B1 → run auth-live |
| Guest account creation | `050_guest_restrictions.sql`, `200_guest_lifecycle.sql` | **Pass (DB)** / live **Blocked** | — | B1 |
| Guest upgrade and collision | `070_account_merge.sql` (16 assertions) | **Pass (DB)** / live **Blocked** | — | B1 |
| Profile updates | `030_profile_isolation.sql`, schema unit tests | **Pass (DB)** / live **Blocked** | — | B1 |
| Catalogue rendering | `catalogue-live.spec.ts` | **Blocked** | High | B1 |
| Published card pages | `150_public_visibility.sql`; 404 on unpublished proven | **Pass (DB)** / live **Blocked** | — | B1 |
| Feed ranking | 43 ranker unit tests, `170_feed_sessions.sql` | **Pass (logic)** / live **Blocked** | — | B1 |
| Seven-card sessions | 19 session unit tests, 38 DB assertions | **Pass (logic)** / live **Blocked** | — | B1 |
| Saved library | DB isolation + `first-win-live.spec.ts` | **Pass (DB)** / live **Blocked** | — | B1 |
| First Learning Win | unit + DB; `first-win-live.spec.ts` | **Pass (parts)** / live **Blocked** | High | B1, B4 |
| PATH recommendations | Next Best unit tests | **Pass (logic)** / live **Blocked** | — | B1 |
| Progress persistence | DB; `first-win-live.spec.ts` | **Pass (DB)** / live **Blocked** | — | B1 |
| Submissions and moderation | `130_submissions.sql`, `230_admin_access.sql` | **Pass (DB)** / live **Blocked** | — | B1 |
| Sharing and reporting | `150_public_visibility.sql`; `data-rights.spec.ts` (404) | **Pass (DB)** / live **Blocked** | — | B1 |
| Personal data export | `190_data_rights.sql` (33 assertions) | **Pass (DB)** / live **Blocked** | — | B1 |
| Account deletion | `190_data_rights.sql`; `080_account_deletion.sql` | **Pass (DB)** / live **Blocked** | Critical | B3 |
| Analytics integrity | `210`, `220` (76 assertions), reconciliation exact | **Pass** | — | — |
| **Admin catalogue & taxonomy** | `230_admin_access.sql` (14), `admin.spec.ts` (404 guard), `admin-live.spec.ts` | **Pass (DB + guard)** / live **Blocked** | — | B1 |

## 3. Security (from `VSHARES_SECURITY_REVIEW.md`)

| Area | Status | Severity | Note |
|---|---|---|---|
| Authorisation (3 layers) | **Pass** | — | `230_admin_access.sql` proves wrong-role refusal |
| Row-level security | **Pass** | — | 395 DB assertions |
| Role escalation | **Pass** | — | `grant_role` admin-only, audited |
| XSS | **Pass** | — | No `dangerouslySetInnerHTML`; source URL rendered as text |
| CSRF | **Pass** | — | Next server actions, same-origin |
| CSP + headers | **Pass** | — | `security-headers.spec.ts`, per-request nonce |
| Redirect validation | **Pass** | — | 17 unit cases |
| Data leakage | **Pass** | — | Admin reads carry no PII |
| Logging redaction | **Pass** | — | 7 log-privacy unit tests |
| Consent enforcement | **Pass** | — | DB + browser checks |
| Export/deletion abuse | **Pass** | — | No-arg export; reauth + confirm delete |
| Dependency scan (prod) | **Pass** | — | `npm audit --omit=dev`: 0 |
| Dependency scan (all) | **Tracked** | Low | 8 moderate, dev-only lint toolchain |
| Secret scan | **Pass (CI)** | — | gitleaks full history every push |
| Findings SR-M8-01/02/03 | **Resolved** | Low/Info | Fixed this milestone |
| **Authentication / session (live)** | **Blocked** | High | B1 |
| External penetration test | **Not run** | — | Recommended before scaling; needs budget |

## 4. Reliability and operations

| Requirement | Evidence | Status |
|---|---|---|
| Backup and restore drill | `scripts/backup-restore-drill.mjs`, 9/9 executed | **Pass (executed)** |
| Schema-migration compatibility | Held-back migration applies on restore | **Pass** |
| Integrity after restore | Row counts + content checksum + RLS + policies | **Pass** |
| Rollup reconciliation | `reconcile_day`, exact after rollup | **Pass** |
| Scheduler (rollup + guest dry run) | `VSHARES_SCHEDULED_JOBS.md` | **Not configured** — needs a platform |
| Destructive guest purge | Implemented, tested | **Disabled by decision** (not approved) |
| Runbook | `VSHARES_BACKUP_RESTORE.md` §6, `VSHARES_SCHEDULED_JOBS.md` §5 | **Partial** — incident procedure pending (M8 stage 4) |

## 5. Performance and accessibility (from `VSHARES_PERFORMANCE_ACCESSIBILITY.md`)

| Requirement | Status | Note |
|---|---|---|
| First-load JS ≤ 300 KB | **Pass** | ~224 KB measured |
| Shell render time | **Pass** | ~100–170 ms |
| DB query latency | **Pass** | feed 0.6 ms, rollup 94 ms |
| axe on every route | **Pass** | 0 violations |
| axe on charts + admin components | **Pass** | 0 violations |
| Keyboard navigation | **Pass** | tested |
| Accessible forms and errors | **Pass** | labelled, announced |
| Colour contrast | **Pass** | measured |
| Core Web Vitals on real journeys | **Blocked** | needs populated app (B1, B5) |
| Manual screen-reader pass | **Not run** | needs a person (M8) |
| Network-failure recovery (live) | **Partial** | unconfigured state tested; mid-journey drop needs a service |

## 6. Content

| Requirement | Status | Owner |
|---|---|---|
| Publication safeguards (draft-only, link check, 2nd review) | **Pass** — enforced in DB and admin UI | — |
| Automated link verification separated from editorial review | **Pass (design)** / **Blocked (run)** — needs network | Claude |
| First 10 cards for editorial sign-off | **Open** | Owner |
| House style approval → remaining catalogue (incl. Productivity) | **Open** | Owner |
| No unreviewed/unverified material published | **Pass** — the DB refuses it | — |

## 7. Compliance gates

| Gate | Status |
|---|---|
| Privacy notice + terms drafts | **Not started** — M8 stage 5, needs owner/legal |
| DPIA | **Not started** — recommended before launch |
| Processor list + region decision | **Blocked** — needs platform choice |
| Data inventory | **Pass** — `VSHARES_DATA_INVENTORY.md` |

## 8. What passes today, in one place

192 unit tests · 395 database assertions (23 files, real PostgreSQL 16) · 90
end-to-end + accessibility (0 axe violations) · backup/restore drill 9/9
executed · 0 production dependency advisories · CI green on every push. The
admin catalogue and taxonomy interface — the one feature blocker from earlier
milestones — is built and tested this milestone.

## 9. What stands between here and release

1. A live environment (B1) — one owner action unblocks the bulk of verification.
2. Running the 62 live checks (B2), verifying erasure (B3) and the first-win
   benchmark (B4) against it.
3. Checking source links and publishing a reviewed catalogue (B5, B6).
4. Compliance drafts and a manual screen-reader pass.
5. Owner go/no-go.

Until those are done, **Milestone 8 is incomplete and the MVP is not
production-ready** — stated plainly, as the directive requires.
