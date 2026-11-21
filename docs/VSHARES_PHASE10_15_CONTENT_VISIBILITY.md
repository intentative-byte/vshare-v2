# VSHARES — Phase 10.15: Content Visibility & Feed Readiness

- **Date:** 2026-11-21 · **Branch:** `claude/gallant-mendel-xey567`
- Read-only diagnosis + release plan. **No hosted writes, no migration, no
  publication, no approval, no role/RLS change, no secrets.** No code change was
  required (see §4).

## 1. Why the feed currently has no accessible content

**Because nothing is published — by design, not a bug.** The complete path:

```
content_items (all DRAFT)
  └─ RLS: content_items_select_published  → only status='published' is visible
       └─ feed query: .eq('status','published')   (src/modules/feed/repository.ts)
            └─ buildSession(): 0 candidates → returns an EMPTY session (not an error)
                 └─ FeedClient: renders the empty/short-session state gracefully
```

Every link in the chain is working correctly:
- The feed **only ever asks for published content** (`repository.ts` comment +
  `.eq("status","published")`), and RLS would refuse anything else anyway.
- An empty pool is handled as "a real answer, not an error"
  (`service.ts: buildSession`), so the UI shows a legitimate empty/closing state,
  **not** a crash or error.
- Published content has **no auth barrier** — `content_items_select_published` is
  `status = 'published'` with no role/guest condition, so if anything were
  published, a guest could see it. The emptiness is purely "nothing is published,"
  not an access problem.

So users see no educational content because **0 of the 10 Originals are published**;
they are all drafts awaiting link-checking and editorial approval.

## 2. Does hosted Supabase actually contain Originals?

**Unknown from here — and not assumed.** This session has no anon key, so hosted
`content_items` cannot be read (REST → 401). Two things must be checked read-only on
hosted dev:
1. **Are the Originals even present?** They come from `supabase/seed/020_cards_batch_1.sql`,
   which is a **seed, not a migration** — "11 migrations applied" does **not** put
   them there. Read-only check: `select count(*) from content_items;` (expect 10 if
   the seed ran, 0 if not).
2. **Is anything published?** `select status, count(*) from content_items group by status;`
   Expected everywhere: all `draft`, 0 `published`.

**Local reference (verified this phase, fresh scratch DB with migrations + seeds):**
10 `draft`, **0 `published`, 0 link-checked**. This is the expected hosted state too.

## 3. Is any content legitimately publishable right now?

**No.** Publication is gated by `moderate_content`, which refuses to publish a card
whose **source link is unchecked** (`link_checked_at is null`) and refuses a
**high-impact card approved by its own author**. Currently:
- 0 cards are link-checked.
- 0 cards have an editorial approval.
- 3 cards are high-impact (need two distinct reviewers).

So nothing can be published yet without first going through link-checking and
human editorial review — which is exactly the intended gate.

## 4. Code fixes necessary

**None.** No defect prevents correctly-authorised content from displaying: the feed
query, RLS, empty-pool handling and empty-state UI are all correct (confirmed by
typecheck, lint, 382 unit tests, 31 DB files / 497 assertions, build, hygiene — all
green this phase). The only reason the feed is empty is that no content has been
published, and **nothing here flips a draft to published to "fix" that** (explicitly
forbidden, and it would bypass the editorial gate).

## 5. First content release plan — the ten Originals

Each card must clear every gate below before it is visible in the feed. Nothing is
published in this phase.

| Step | What | Who / how | Gate enforced by |
|---|---|---|---|
| 1 | **Link check** each source URL | `npm run check:links` (or manual), owner-run | DB refuses publish while `link_checked_at` is null |
| 2 | **Evidence verification** (claims vs source) | human reviewer, using the review pack + the T4b support classifier | editorial judgement (seed is NOT pre-fact-checked) |
| 3 | **Editorial review + decision** in `/admin/editorial` | authenticated moderator/admin | `record_editorial_decision` (staff-only, server identity) |
| 4 | **Independent second review** (high-impact only) | a second, distinct authenticated reviewer | `editorial_publication_eligible` needs 2 distinct approvers; author ≠ approver |
| 5 | **Publish** (owner-gated) | `moderate_content(..., 'approve')` by a moderator who is not the author | link-checked + (high-impact) two-reviewer rule |

### The ten, by requirement

| Card (slug) | Impact | Needs 2 reviewers? | Link check | Evidence verify | Review+approve | Publish |
|---|---|---|---|---|---|---|
| building-a-first-monthly-budget | **HIGH** | **yes** | ✅ required | ✅ required | ✅ | owner |
| getting-to-sleep-nhs-guidance | **HIGH** | **yes** | ✅ | ✅ | ✅ | owner |
| spotting-financial-scams | **HIGH** | **yes** | ✅ | ✅ | ✅ | owner |
| asking-for-your-own-data | standard | no | ✅ | ✅ | ✅ | owner |
| machine-learning-crash-course | standard | no | ✅ | ✅ | ✅ | owner |
| preparing-for-an-interview | standard | no | ✅ | ✅ | ✅ | owner |
| setting-up-a-business-uk | standard | no | ✅ | ✅ | ✅ | owner |
| spaced-repetition-for-memory | standard | no | ✅ | ✅ | ✅ | owner |
| staying-secure-online-basics | standard | no | ✅ | ✅ | ✅ | owner |
| writing-people-understand | standard | no | ✅ | ✅ | ✅ | owner |

All 10 require link-checking, evidence verification and an editorial approval; the
**3 high-impact** additionally require an independent second reviewer. Detailed,
owner-run steps are in `docs/VSHARES_ORIGINALS_PUBLICATION_PROCEDURE.md`.

## 6. Owner approvals needed, and the exact safe steps

Making the first content available is a sequence of **owner-authorised hosted
writes** (link-check timestamps, editorial decisions, publication) — none done in
this phase.

1. **Unblock the workbench** (config only, no write): set the anon key, fix the
   Supabase redirect URLs, sign in, bootstrap an admin + a distinct moderator —
   `docs/VSHARES_PHASE10_14_ACCEPTANCE_READINESS.md` §3.
2. **Read-only confirm** the hosted inventory (§2 queries) — expect 10 draft, 0
   published. If 0 rows, the Originals seed must be applied to dev first (separate
   owner approval).
3. **Link-check** the ten sources (`npm run check:links` against dev, owner-run) —
   a hosted write of `link_checked_at`. **Separate approval.**
4. **Human editorial review** in `/admin/editorial`: record decisions; obtain a
   **second distinct reviewer** for the 3 high-impact cards. Recording decisions is
   a hosted write. **Separate approval.**
5. **Publish** the approved, link-checked cards via the moderation path
   (`moderate_content`), by a moderator who is not the author. **Separate approval**
   — this is the first real publication.

After step 5, the published cards appear in the feed automatically (the query +
RLS already serve published content to everyone, guests included).

## 7. Quality gates (this phase, exact)

| Gate | Kind | Result |
|---|---|---|
| typecheck | static | **PASS** |
| lint | static | **PASS** |
| `npm test` | mocked/unit | **PASS — 382 passed, 5 skipped** |
| `npm run test:db` | **real local PostgreSQL** | **PASS — 31 files, 497 assertions, 0 failed** |
| build | build | **PASS** |
| hygiene | static | **PASS — 425 files** |
| Hosted verification | hosted | **NONE** (no anon key) — not claimed |

**Bottom line:** the application is healthy; the feed is empty only because the
editorial gate has not yet been walked for any card. The fix is the editorial
workflow (owner-gated), not a code change — and nothing was published or
auto-approved.
