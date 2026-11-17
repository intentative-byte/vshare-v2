# VSHARES — Phase 9.2: live-service test investigation & plan

- **Date:** 2026-11-17 · **Branch:** `claude/gallant-mendel-xey567` · **Commit:** `656c2dc`
- **Dev project:** `vshare-development` (`apgchptregdpswiwmyua`)
- Investigation only. No live write-dependent test was run, no content published,
  no remote schema or data changed, no secret printed. The config-gated live
  tests are **not** enabled in code, because enabling them would let write tests
  run without owner approval.

## 1. Why the 72 live tests skip even when the key is configured (exact cause)

The skip is decided in the **Playwright test-runner process**, which **never
loads `.env.local`**:

- `playwright.config.ts` has **no** `dotenv`, no `globalSetup`, and no env
  loading; `dotenv` is not a dependency; `test:e2e` is just `playwright test`.
- Next.js auto-loads `.env.local` only for the app it runs
  (`next build` / `next start` in the `webServer`). That is why the **app**
  sees the key (and rendered its configured pages in Phase 9.1) — but the
  **runner** does not.
- Each config-gated spec evaluates, at module load **in the runner**:
  ```ts
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  test.skip(!configured, "No database configured for this run.");
  ```
  On Windows the runner's `process.env` has neither variable (they live only in
  `.env.local`), so `configured` is `false` → **skip**.

There is also a **second, independent** reason for 26 of the 72: `admin-live`
and `analytics-live` call **`test.skip(true, …)` unconditionally** — they never
un-skip from configuration alone, by author's choice, because they also need a
privileged account and a computed rollup.

**Fix for the config-gated 46:** make the runner see the variables — either
export them in the shell (immediate, §9) or load `.env.local` in
`playwright.config.ts` (repeatable, §7). Neither weakens a test.

## 2. Test-by-test classification

Groups: **A** read-only safe · **B** needs a dedicated account · **C** needs
approved **published** content · **D** writes/needs cleanup · **E** needs extra
config/infra. Counts are per spec; every test runs twice (desktop + mobile), so
double for the suite total. 36 tests × 2 = 72.

| Spec · test | Group | Prerequisite | DB effect | Cleanup |
|---|---|---|---|---|
| **catalogue-live** · explore lists categories | **A** | taxonomy seed applied | read | none |
| **catalogue-live** · category lists topics, warns high-impact | **A** | taxonomy seed | read | none |
| **catalogue-live** · unpublished card is 404 in public | **A** | — (verifies draft-not-public) | read | none |
| **auth-live** · guest/sign-in text on `/you` | **A** | DB configured | read | none |
| **auth-live** · sign-out ends session | **A** | — (self-skips with no session) | read / no-op | none |
| **data-rights-live** · my submissions shows only mine | **A** | DB configured | read (empty state) | none |
| **data-rights-live** · export downloads a documented file | **A** | DB configured | read; may set a guest cookie | none (ephemeral guest) |
| **auth-live** · form reports a link was sent | **D** | auth + **SMTP/inbucket** (E) | writes an auth OTP, sends email | remove test user |
| **auth-live** · unknown and known answered identically | **D** | auth + SMTP (E) | writes OTPs for 2 addresses, sends email | remove test users |
| **data-rights-live** · submission reaches the queue | **D** | DB configured; auto-creates a guest | **writes** a submission + guest account | delete submission + guest |
| **data-rights-live** · a card can be shared | **C** | ≥1 **published** card | read | none |
| **data-rights-live** · reporting same card twice refused | **C + D** | ≥1 published card | **writes** a content_report | delete report |
| **feed-live** · session shows position/progress/stop | **C** | ≥7 published cards in a topic | read | none |
| **feed-live** · a recommendation explains itself | **C** | published feed | read (maybe impression) | impression only |
| **feed-live** · session ends, does not refill | **C + D** | published feed | **writes** interactions/session | delete session rows |
| **feed-live** · opening a card ≠ completed | **C** | published feed | read | none |
| **feed-live** · visitor gets a session, nothing stored | **C** | published feed | read; asserts no auth cookie | none |
| **feed-live** · account created on first completion | **C + D + B** | published feed | **writes** completion + guest | delete guest + interaction |
| **first-win-live** · reach a useful card, no account | **C** | published Budgeting card | read; asserts no cookie | none |
| **first-win-live** · completing gives a win summary | **C + D + B** | published Budgeting card | **writes** completion + guest | delete guest + interaction |
| **first-win-live** · completion in progress dashboard | **C + D + B** | published Budgeting card | **writes** completion + guest | delete guest + interaction |
| **first-win-live** · saving adds to library, removable | **C + D + B** | published Budgeting card | **writes** a save, then deletes it | residual guest |
| **first-win-live** · path tab names a next step | **C** | published content | read | none |
| **admin-live** · 5 tests (create category/card, roles, audit) | **B + D + E** | administrator account | **writes** taxonomy/cards | hard-skipped (`skip(true)`) |
| **analytics-live** · 8 tests (metrics dashboard) | **B + D + E** | staff account + **computed rollup** | read of a rollup that must first be written | hard-skipped (`skip(true)`) |

**Per-group totals (× 2 projects):** A = **14** · C = **26** · D-only (not
content-gated) = **6** · B/E hard-skipped (admin+analytics) = **26**.

## 3. Live read-only connectivity (what this session could verify)

This session holds **no anon key**, so authenticated read-only API checks
cannot run here; the owner runs them on Windows (§9). Unauthenticated probes
(real, this session):

| Probe | Result | Meaning |
|---|---|---|
| `GET /rest/v1/content_items?status=eq.published` no apikey | **HTTP 401** | anon data access requires the key; unauthenticated is blocked |
| same with a **bogus** apikey | **HTTP 401** | invalid keys rejected |
| `GET /auth/v1/settings` | **HTTP 401** | gateway enforces the apikey on every route |

→ **Unauthenticated access restriction: PASS.** RLS, schema state and
draft-visibility over the API need the key and are **owner-verifiable** via §9.

## 4. Tests safely executed, and their outcomes

**None executed live in this session** — there is no anon key here, so no live
test could run, and none was faked. The complete non-live suite remains green at
`656c2dc` (90 passed / 72 skipped / 0 failed; typecheck, lint, 200 unit, build
all pass). The safe read-only live subset (Group A) is ready for the owner to
run on Windows (§9), starting with the fully read-only `catalogue-live.spec.ts`.

## 5. What blocks the seven-piece learning session

1. **No published content.** All ten seeded cards load as **drafts** with
   `link_checked_at` null (`supabase/seed/020_cards_batch_1.sql`), and the DB
   refuses to publish a card whose link is unchecked — so the feed is empty.
2. **Env-loading gap** (§1) — the live feed specs skip in the runner.
3. **Seed application** — taxonomy + cards seeds must be applied to the dev
   project (migrations alone do not seed).

**Minimum content for an authentic live seven-piece test (no admission
bypass):** at least **7** cards **link-checked** (`npm run check:links`) and
then **approved** through moderation to `published`, **including one Budgeting
card** (for `first-win-live`). This goes through the real VAI admission gate;
drafts are never force-published.

## 6. Genuine defects discovered

**None.** The 72 skips are a test-harness configuration gap (§1), not an
application defect. The two real defects in this area were already fixed in
Phase 9.1 (`656c2dc`).

## 7. Recommended minimal repairs (require owner approval to commit)

**R1 — repeatable env loading (zero new dependency).** Node 22 (this project)
ships `process.loadEnvFile`. Add to the top of `playwright.config.ts`:
```ts
// Make .env.local visible to the test runner's skip guards, as Next.js
// already makes it visible to the app under test.
try { process.loadEnvFile(".env.local"); } catch { /* fine when absent */ }
```
This alone would un-skip **all** config-gated specs, **including write tests** —
so it must land **with R2**, or write tests would run unapproved.

**R2 — a write gate so only read-only live tests run by default.** Add a second
guard to the write-performing describe blocks, e.g.
`test.skip(!process.env.VSHARES_LIVE_WRITES, "Live writes not authorised.")`,
leaving read-only Group A tests running whenever the key is present. This adds a
safety gate; it does not weaken any assertion. Write tests then run only when the
owner sets `VSHARES_LIVE_WRITES=1`.

Until R1+R2 are approved, use the shell-export workflow (§9), which runs only the
named read-only files.

## 8. Actions requiring owner approval

1. Authorise running **write** live tests (Groups C/D/B) — they create guests,
   submissions, reports, interactions and saves on the dev project and need
   cleanup. **Not run without approval.**
2. Approve R1+R2 (or decline in favour of the shell workflow).
3. Apply the **seeds** to the dev project and **publish ≥7 link-checked,
   approved cards** (incl. Budgeting) to unblock Groups C and the seven-piece
   session — through the admission pipeline, no bypass.
4. Provide **staff/administrator** test accounts and a **computed rollup** to
   unblock `admin-live` / `analytics-live` (26 tests).

## 9. Exact Windows Git Bash verification commands

Run from the repo root, with `.env.local` holding the dev URL + anon key.
Do **not** run the whole `test:e2e` suite until write tests are authorised —
that would execute writes against the dev project.

```bash
# 1. Make the test runner see the dev URL + anon key (it does not read .env.local on its own)
set -a; source .env.local; set +a
```

```bash
# 2. Confirm the runner now sees them (prints only whether each is set, never the value)
node -e "console.log('URL set:', !!process.env.NEXT_PUBLIC_SUPABASE_URL, '| ANON set:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)"
```

```bash
# 3. Read-only live checks — the catalogue file is entirely read-only (6 checks: desktop + mobile)
npx playwright test tests/e2e/catalogue-live.spec.ts
```

```bash
# 4. Read-only anonymous API probe (needs the anon key present in the shell from step 1)
curl -s -o /dev/null -w "published cards readable as anon: HTTP %{http_code}\n" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/content_items?select=slug&status=eq.published&limit=1"
```

```bash
# 5. Draft-visibility check over the API: a draft slug must NOT be returned to anon (expect an empty [] )
curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/content_items?select=slug,status&slug=eq.getting-to-sleep-nhs-guidance"
```

Write-dependent live tests stay **unauthorised** until the owner approves §8.1.

## 10. Final status per verification category

| Category | Status |
|---|---|
| Cause of the 72 skips identified | **PASS** (runner never loads `.env.local`; 26 also hard-skipped) |
| Test-by-test classification | **PASS** (A 14 · C 26 · D-only 6 · B/E 26) |
| Unauthenticated access restriction | **PASS** (401 without/with bogus key) |
| Authenticated read-only connectivity | **BLOCKED** (no anon key in this session → owner runs §9) |
| Live read-only test execution | **BLOCKED** (no key here; Group A ready for the owner) |
| Seven-piece session live | **BLOCKED** (needs ≥7 approved published cards incl. Budgeting) |
| Genuine defects | **PASS** (none found) |
| Security gates preserved | **PASS** (no schema/data/role change; nothing published) |
