# VSHARES — Phase 9 live integration & security verification

- **Date:** 2026-11-17
- **Branch / commit:** `claude/gallant-mendel-xey567` @ `95ba9f7`
- **Supabase dev project:** `vshare-development` (`apgchptregdpswiwmyua`)
- **Governing rule honoured throughout:** no mock is ever substituted for
  live-service verification. Where a live service is required and unavailable,
  the result is **BLOCKED** with the exact unmet prerequisite named — never a
  claimed PASS. No test was weakened, no security gate relaxed, no remote
  schema or data written.

## What this session can and cannot reach (measured, not assumed)

| Probe | Method | Result |
|---|---|---|
| Dev project URL in config | `.env.local` key inspection (values redacted) | **present** — `NEXT_PUBLIC_SUPABASE_URL` filled (40 chars) |
| Publishable (anon) key | `.env.local`, shell env, `get_environment` | **absent everywhere** — `NEXT_PUBLIC_SUPABASE_ANON_KEY` empty, not in shell, `environment_variable_names: null`, no network secret |
| Service-role key | same | **absent** (correct — never requested in chat) |
| REST reachability | `curl .../rest/v1/` | **HTTP 401** — project is alive, requires the key |
| Auth reachability | `curl .../auth/v1/health` | **HTTP 401** — alive, requires the key |
| Direct Postgres | TCP to `db.*:5432` and poolers `:5432/:6543` | **unreachable/blocked** from this session |

**Consequence:** every requirement that needs the live dev project — remote
schema/migration inspection, live auth, live journeys, live RLS between real
accounts — is **BLOCKED** on the anon key (and, for writes, on explicit owner
authorisation, which was not given). Everything that lives in code or in a real
database is verified locally against **real PostgreSQL 16** (the real
migrations, the real policies), which is where those properties actually live.

## Phase verdicts

| Phase | Verdict | Basis |
|---|---|---|
| 9.1 Environment & database | **PASS (local real PostgreSQL)** · remote recording **BLOCKED** (no key / no DB route) | all 8 migrations apply in order; objects, grants, RLS, config v2 verified below |
| 9.2 Auth & user isolation | **PASS (DB-layer isolation)** · live auth **BLOCKED** (no key; no remote test accounts authorised) | cross-user isolation proven by RLS tests; browser auth journeys skip |
| 9.3 Seven-piece learning engine | **PASS (logic + DB)** · live render **BLOCKED** | session lifecycle, engagement, partial/empty feedback proven in `240`/`250`/`260` |
| 9.4 VAI educational quality control | **PASS** | admission pipeline present; content defaults to `draft`; feed serves only `published`; drafts stay unpublished |
| 9.5 Personalised learning intelligence | **PASS** | recompute-from-reviews (idempotent), confidence scaling, diversity caps, explainability — unit + DB |
| 9.6 Real-service E2E | **BLOCKED (classified)** | 72 live checks, all blocked on config (anon key); 0 executable now; 0 defects |
| 9.7 Security & abuse | **PASS** | apply_affinity locked down; ownership + inclusive window; concurrency; RLS; input validation |
| 9.8 Performance & reliability | **PARTIAL** | local build/latency measurable; live latency on real journeys **BLOCKED** |
| 9.9 Complete quality gate | **PASS** (live e2e subset BLOCKED, reported as skipped) | full gate below |
| 9.10 Evidence report | this document + the chat report | — |

## Phase 9.1 / 9.7 — security properties (real PostgreSQL introspection)

Verification DB built exactly as the suite builds it (harness → 8 migrations →
post-migrate), then introspected:

- **`app.apply_affinity(uuid,uuid,numeric,numeric)` EXECUTE** — `anon = f`,
  `authenticated = f`, `public = f`. A client role cannot invoke it to forge
  another account's affinity. ✔
- **`record_session_review`** — `SECURITY DEFINER = t`; reads
  `app.current_user_id()` (ownership) = t; contains
  `between v_started and v_ended_at` (inclusive window) = t; holds
  `pg_advisory_xact_lock` (per-user concurrency) = t. ✔
- **`session_reviews` columns** — includes `content_count` (delivered) and
  `engaged_count` (engaged), both `NOT NULL`. ✔
- **RLS enabled** — `session_reviews`, `user_format_affinity`, `user_topics`
  all `relrowsecurity = t`. ✔
- **Ranking config** — version 1 `is_active = f`, version 2 `is_active = t`
  (adaptive weights live). ✔

## Phase 9.4 — VAI admission gate

- Pipeline functions present and `SECURITY DEFINER`: `create_card`,
  `record_link_check`, `moderate_content`, `start_feed_session`,
  `record_recommendations`, `end_feed_session`.
- `content_items.status` default is **`'draft'`** — admission is required, not
  optional; RLS is enabled on the table.
- Feed reads from `content_items` filtering `.eq("status","published")`
  (`src/modules/feed/repository.ts:64,71`).
- The ten seeded cards therefore cannot enter the feed until link-checked and
  approved. No draft was published; the admission pipeline was not bypassed.

## Phase 9.6 — the 72 skipped live-service tests, classified

All 72 live Playwright checks skip on one guard —
`NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY` — so with the anon
key absent, **every one is "blocked by missing configuration."** A subset also
needs approved content and/or a privileged account; those prerequisites sit
behind the key and cannot even be reached yet.

| Spec (× desktop+mobile) | Count | Primary blocker | Also needs |
|---|---|---|---|
| `analytics-live` | 16 | anon key | staff account + a computed rollup |
| `feed-live` | 12 | anon key | published catalogue |
| `first-win-live` | 10 | anon key | published catalogue |
| `data-rights-live` | 10 | anon key | published catalogue (for some steps) |
| `admin-live` | 10 | anon key | administrator account |
| `auth-live` | 8 | anon key | — |
| `catalogue-live` | 6 | anon key | published catalogue |
| **Total** | **72** | **all: missing config (anon key)** | |

- **Executable now:** 0 · **Blocked (config):** 72 · **Blocked (content):** subset of the above · **Blocked (external auth):** admin/staff subset · **Failing on a defect:** **0.**
- No live test was converted to a mock; none is reported as passed.

## Phase 9.9 — complete quality gate (this session, commit `95ba9f7`)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** |
| Lint | `npm run lint` | **PASS** (0 warnings) |
| Hygiene | `npm run check:hygiene` | **PASS** (299 tracked files) |
| Unit | `npm test` | **PASS** — 200/200 (14 files) |
| Database (RLS/security/functions) | `npm run test:db` | **PASS** — 26 files, **450 assertions, 0 failed** (real PostgreSQL 16) |
| Concurrency | `npm run test:concurrency` | **PASS** — 6 observations / 1 row / affinity 0.816 under 10 concurrent calls |
| E2E + accessibility | `npm run test:e2e` | **PASS** — 90 passed, **72 skipped** (live, BLOCKED — not passed) |
| Production build | `npm run build` | **PASS** |
| Production dependency audit | `npm audit --omit=dev` | **PASS** — 0 vulnerabilities |
| Full-tree audit | `npm audit` | **17 (11 high, 6 moderate)** — all dev/build tooling (`picomatch` ReDoS, no fix); **gate left unchanged, advisory open** |

## Remaining blockers & risks

1. **Anon key absent in this session** → all live verification BLOCKED. Unblocks
   with the publishable key set as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a local
   secure method — never pasted into chat; see `VSHARES_SUPABASE_SETUP.md`).
2. **Remote migration-application state unverifiable** from here (no key, no DB
   route). Migration 8 is authored but **not applied remotely** by this session.
3. **No published catalogue** → content-dependent journeys stay blocked until
   `check:links` runs and the first cards are approved.
4. **`picomatch` dev-tree advisory** open; CI dependency job stays red until an
   upstream fix or an explicit owner decision (proposed two-tier gate, D-099 —
   not applied).

## Compliance with restrictions

No deploy · no remote migration applied · no merge · no draft published · no CI
gate weakened · no key or user data exposed · no live user data modified · no
remote test account or data created · no RLS shortcut. Verification only.
