# VSHARES — VAI Adaptive Learning: testing-first evidence report

- Date: 2026-11-17 · Protocol: mandatory testing-first, six phases.
- Rule honoured throughout: **no mock results are substituted for live-service
  verification.** Where a live service is required and unavailable, the result
  is **BLOCKED**, with the exact unmet prerequisite named — never PASS.

## Executive status

| Phase | Result |
|---|---|
| 1. Environment verification | **PASS** (branch, Node, connectivity) · live-auth prerequisite **BLOCKED** |
| 2. Database testing | **PASS against local real PostgreSQL 16** · the dev-Supabase apply/verify is **BLOCKED** |
| 3. Real user journey (live) | **BLOCKED** — no anon key in this session, and no published catalogue |
| 4. Intelligence verification | **PASS** for all logic-layer checks · the live rendered journey **BLOCKED** |
| 5. Regression and security | **PASS** (200 unit, 420 DB, 90 e2e/axe) · dependency advisory investigated, gate **not** weakened |
| 6. Evidence report | This document |

**Bottom line:** every requirement that can be verified without the live
Supabase service is verified and passing against a real database. The live
user journey cannot be run because the **publishable (anon) key is not present
in this session** (not in the shell, not in `.env.local`, not set as a cloud
environment variable) and the seeded catalogue is still ten unpublishable
drafts. Per the governance rule, those remain BLOCKED, not PASS.

---

## Phase 1 — Environment verification

| Check | Command | Result |
|---|---|---|
| Development branch | `git branch --show-current` | **PASS** — `claude/gallant-mendel-xey567` (the approved branch) |
| Node.js version | `node --version` | **PASS** — v22.23.4 |
| Dev Supabase reachable | `curl …/rest/v1/` | **PASS** — HTTP 401 (reachable; needs the key) |
| Anon key in this session | env + `.env.local` + `get_environment` | **BLOCKED** — **not set anywhere** (env UNSET, `.env.local` empty, `environment_variable_names: null`) |
| Service-role key | — | not present (correct — never requested in chat) |
| Unapplied migrations | `ls supabase/migrations` | **8 local migrations**, newest `20261117120000_adaptive_learning.sql`. **Application state on the dev project is unverifiable without the key.** The adaptive migration was authored after the owner's apply instructions, so it is certainly not yet applied there |

Production untouched; no credential printed or exposed.

## Phase 2 — Database testing

The dev-Supabase target is **BLOCKED** (no key to verify application; direct
Postgres `:5432` is not reachable from this session, so the owner applies
migrations via `supabase db push` — see `VSHARES_SUPABASE_SETUP.md`).

What **was** verified, against **local real PostgreSQL 16** (the real
migrations, the real policies, evaluated under the same request claims the API
layer sets — not mocked, but not the dev project either):

```
DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres npm run test:db
```
Result: **applied all 8 migrations in order** (including
`20261117120000_adaptive_learning.sql`), then **24 files, 420 assertions, 0
failed.**

| Requirement | Evidence | Result |
|---|---|---|
| Session reviews | `240_session_feedback.sql` — stored, one per session, tied to the items shown | **PASS (local)** |
| Format preferences | `240` — `user_format_affinity` rises on choice, gradually, never locked | **PASS (local)** |
| Confidence tracking | `240` — `user_topics.observations` grows with every action | **PASS (local)** |
| RLS and data ownership | `240` — a review/preference is owner-only; another user reads none; a review on another's session is refused | **PASS (local)** |
| Export | `240` — reviews and format preferences appear in `export_my_data` | **PASS (local)** |
| Deletion | `240` — `delete_my_account` removes reviews and format preferences | **PASS (local)** |

## Phase 3 — Real user journey (guest → 7 items → feedback → adaptation)

**BLOCKED.** Running it needs all of:
1. the **anon key** in this session (absent), and
2. **published** cards to complete seven of — the ten seeded cards are
   **drafts** with no link check, so none can be shown or completed, and
3. a confirmed **migration application** on the dev project.

None is satisfied, so the journey has **not been run and is not reported as
passed.** The journey is written as live end-to-end tests
(`first-win-live.spec.ts`, `feed-live.spec.ts`, and the adaptive steps), which
remain **skipped** until a service exists. I did not simulate the journey.

The *logic* each journey step exercises is, however, verified in Phase 4.

## Phase 4 — Intelligence verification

Verified at the logic layer (pure ranker unit tests) and the database layer
(real PostgreSQL), which is where these properties live.

| Requirement | Evidence | Result |
|---|---|---|
| VAI never recommends unpublished content | feed query `.eq("status","published")` (`feed/repository.ts:71`); `160_interactions.sql:150-156` (an unpublished card cannot be completed, saved, or even recorded as an impression); `data-rights.spec.ts:25` (an unpublished slug is 404) | **PASS** |
| Format preference influences ranking without excluding others | `adaptive-ranking.test.ts` — a preferred format is boosted; a stronger article still outranks a weak video; other formats are never filtered out | **PASS** |
| Confidence scaling | `adaptive-ranking.test.ts` — a 40-observation affinity counts more than a 1-observation one; an explicit declared interest leads a low-confidence inference | **PASS** |
| Cold-start recommendations | `adaptive-ranking.test.ts` + `240` — a brand-new learner gets a full, quality-led ranking with no format/affinity contribution | **PASS** |
| Exploration diversity | `session.test.ts` + `adaptive-ranking.test.ts` — the discovery slot persists even for a converged profile; per-topic and per-source caps hold | **PASS** |
| Ratings never imply mastery | `240` — a 4/5 rating records satisfaction; no completion, skill or mastery is created | **PASS** |
| Privacy | `240` — new tables owner-only, exportable, deletable; the audit entry holds no rating/format/note | **PASS** |
| Explainability | `explain.ts` phrasing + the component log; a format reason is generated only when a real preference exists (`formatFit` is 0 otherwise) | **PASS** |

The *live rendered* form of these (same checks through the running app) is part
of the BLOCKED journey in Phase 3.

## Phase 5 — Regression and security

| Suite | Command | Result |
|---|---|---|
| Unit | `npm test` | **PASS — 200 passed, 0 failed** (14 files) |
| Database | `npm run test:db` | **PASS — 24 files, 420 assertions, 0 failed** (real PostgreSQL 16) |
| End-to-end + accessibility | `npm run test:e2e` | **PASS — 90 passed, 0 failed; 72 skipped** (the live-service journeys, listed below) |
| Hygiene, lint, types, build | — | **PASS** (25 routes) |
| Production dependency audit | `npm audit --omit=dev` | **PASS — 0 vulnerabilities** |

**Skipped (BLOCKED on a live service), reported explicitly — not passed:** 72
end-to-end checks across auth, guest upgrade, catalogue, feed, first-win,
library/PATH/progress, submissions/moderation, export/deletion, analytics, the
admin interface and the adaptive journey. Every one needs the auth service and,
for most, a published catalogue. `VSHARES_LIVE_VERIFICATION.md` lists them.

**Dependency advisories — investigated, gate not weakened.** The full-tree
audit shows `critical=0, high=11, moderate=6`, all in dev/build tooling, all
rooted in the newly-published `picomatch` glob-ReDoS (all versions, no fix;
`npm audit fix` is broken on this tree). **Production is 0.** The ReDoS is not
exploitable in our usage (our own static glob patterns). I did **not** change
the CI gate — a two-tier gate is *proposed and awaiting owner approval*
(`VSHARES_SECURITY.md` §7, D-099). The CI dependency-audit job therefore remains
red on these advisories until the owner decides; I have not relaxed any control
to turn it green.

## Phase 6 — Corrective actions and what unblocks the rest

| Blocked item | Unmet prerequisite | Corrective action (owner) |
|---|---|---|
| Live DB verification (Phase 2 dev) | anon key absent; migration-application unconfirmed | Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key) as a cloud env var or send it; apply the 8 migrations via `supabase db push` (incl. the adaptive one) |
| Real user journey (Phase 3) | no key + no published cards | the above, plus run `check:links` and approve the first cards so there is something to complete |
| 72 live e2e (Phase 5) | auth service + catalogue | the above |
| Red dependency-audit CI job | security-gate change needs sign-off | approve the proposed two-tier gate (D-099), or wait for an upstream `picomatch` fix |

## Governance compliance

- **No verified testing, no advancement:** no new milestone was started. This
  turn was verification only.
- **No mock substituted for live verification:** the live journey is BLOCKED,
  not faked.
- **No deploy, no merge, no content published, no security control relaxed**
  without approval. The audit gate was left as-is and the gate change reverted
  pending your decision.
