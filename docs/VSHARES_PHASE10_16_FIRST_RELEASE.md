# VSHARES — Phase 10.16: First Content Release Preparation

- **Date:** 2026-11-21 · **Branch:** `claude/gallant-mendel-xey567`
- Read-only audit + plan. **No hosted writes, no migration, no publication, no
  approval, no role/RLS change, no secrets.** Nothing was published or approved.

## 1. Hosted inventory verification — status: UNVERIFIED (no hosted access)

This session has no anon key (hosted REST → 401) and no admin DB connection, so
the hosted dev catalogue **cannot be read here**. The results below are **local
reference only** (a fresh scratch DB from all 11 migrations + both seeds); the
hosted figures are **unverified** until the owner runs the read-only SQL.

**Local reference (verified):** `content_items` = **10 draft, 0 approved-state,
0 published, 0 link-checked**.

### Owner-executable READ-ONLY SQL (hosted dev — reads only, no writes)

Run in the Supabase SQL editor for `apgchptregdpswiwmyua`:

```sql
-- a) Do the ten Originals exist on hosted? (0 ⇒ the seed was never applied there)
select count(*) as total_cards from public.content_items;

-- b) Draft / approved / published breakdown
select status, count(*) from public.content_items group by status order by 1;

-- c) How many are link-checked / publishable right now (expected: 0)
select
  count(*) filter (where link_checked_at is not null) as link_checked,
  count(*) filter (where status='published')          as published
from public.content_items;

-- d) The ten by slug + high-impact flag (to match this matrix)
select slug, status, is_high_impact, (link_checked_at is not null) as link_checked
from public.content_items order by is_high_impact desc, slug;

-- e) Any editorial decisions recorded yet? (expected: 0)
select count(*) as decisions from public.editorial_decisions;
```

Expected healthy result: (a) 10 if the seed ran — **0 means the Originals are not
on hosted dev and must be imported under separate approval**; (b) all `draft`;
(c) 0 / 0; (e) 0.

## 2. Ten-card release-readiness matrix

Evidence status is from a **real, read-only live retrieval** (2026-11-21) + the
improved support classifier — **a reachable link is never counted as a verified
claim.** Machine "support" is textual only; faithful paraphrases of reputable
sources (NHS, NCSC, GOV.UK, …) show as `insufficient_evidence` because the
takeaways are our editorial wording, **not** because they are false — they need a
**human** to confirm the paraphrase against the source.

Full data: `docs/samples/originals-batch-1-release-readiness.json` (+ the
authoritative card data in `docs/samples/originals-batch-1-cards.json`).

| # | Card / category | HI | Quality | Link check | Source retrieval | Machine evidence | Reviewers needed | Outstanding blockers | Next action |
|---|---|---|---|---|---|---|---|---|---|
| 1 | building-a-first-monthly-budget · personal-finance | **HIGH** | 85 | ❌ none | **robots-disallowed** | not verified | **2 distinct** | source not retrievable; no grounded claim; no approval | confirm source access / alt source → link-check → review ×2 |
| 2 | getting-to-sleep-nhs-guidance · health | **HIGH** | 90 | ❌ none | ok | not verified | **2 distinct** | claims not machine-grounded; no approval | human evidence grounding → link-check → review ×2 |
| 3 | spotting-financial-scams · personal-finance | **HIGH** | 85 | ❌ none | ok | not verified | **2 distinct** | claims not machine-grounded; no approval | human grounding → link-check → review ×2 |
| 4 | asking-for-your-own-data · technology-and-ai | no | 85 | ❌ none | **http_error** | not verified | 1 | source not cleanly retrievable; no approval | re-check source URL → link-check → review |
| 5 | machine-learning-crash-course · technology-and-ai | no | 85 | ❌ none | ok | not verified | 1 | claims not machine-grounded; no approval | human grounding → link-check → review |
| 6 | preparing-for-an-interview · career-development | no | 80 | ❌ none | ok | not verified | 1 | claims not machine-grounded; no approval | human grounding → link-check → review |
| 7 | setting-up-a-business-uk · entrepreneurship | no | 80 | ❌ none | ok | not verified | 1 | claims not machine-grounded; no approval | human grounding → link-check → review |
| 8 | spaced-repetition-for-memory · learning-how-to-learn | no | 85 | ❌ none | ok | not verified | 1 | claims not machine-grounded; no approval | human grounding → link-check → review |
| 9 | staying-secure-online-basics · technology-and-ai | no | 90 | ❌ none | ok | not verified | 1 | claims not machine-grounded; no approval | human grounding → link-check → review |
| 10 | writing-people-understand · communication | no | 85 | ❌ none | ok | not verified | 1 | claims not machine-grounded; no approval | human grounding → link-check → review |

**Retrieval:** 8/10 sources retrieved cleanly; **2 need attention** — card 1
(robots-disallowed) and card 4 (HTTP error). **Publishable now: 0.** Every card
needs link-checking, human evidence verification, and editorial approval; the 3
high-impact cards additionally need a second independent reviewer.

### What "quality 80–90" means here
Those are the **seed-assigned advisory** quality scores, not an evidence verdict.
They do not substitute for link-checking, factual verification, or human review.

## 3. Authentication readiness (confirm the admin session on Windows)

Role/login configuration was reviewed in Phase 10.14; no role is created or granted
here. To **confirm** the existing admin can reach the workbench (Git Bash, repo
root, owner machine):

```bash
# App must have NEXT_PUBLIC_SUPABASE_ANON_KEY set and the Supabase redirect URLs
# configured (Phase 10.14 §3). Then:
npm run dev                     # http://localhost:3000

# 1. Confirm a session exists: open http://localhost:3000/you
#    (redirect to /sign-in ⇒ not signed in → request a magic link and open it)
# 2. Confirm staff access: open http://localhost:3000/admin/editorial
#    (200 + board ⇒ admin OK; 404 ⇒ not signed in OR no admin/moderator role)
# 3. Read-only confirm the role WITHOUT changing it (Supabase SQL editor):
#      select u.email, r.role from auth.users u
#      join public.user_roles r on r.user_id = u.id
#      where u.email = 'you@example.com';
```

If step 2 is 404 while signed in, the account lacks a staff role — granting one is
an **owner action held for separate approval** (Phase 10.14 §3 step 5). **No role
is granted in this phase.**

## 4. Controlled release plan (every hosted write needs separate approval)

1. **Confirm hosted inventory** — run §1 read-only SQL. (read-only)
2. **Import missing drafts** — only if §1(a) returns 0; apply
   `supabase/seed/020_cards_batch_1.sql` to dev. **⛔ separate approval (hosted write).**
3. **Source link checks** — `npm run check:links` against dev for the ten URLs;
   fix cards 1 & 4 first (inaccessible sources) — swap to an accessible canonical
   source if needed. Writes `link_checked_at`. **⛔ separate approval (hosted write).**
4. **Factual & editorial review** — in `/admin/editorial`, a human grounds each
   claim against its source (the machine could not), then records a decision.
   **⛔ separate approval (hosted write).**
5. **Independent high-impact reviews** — a second, distinct authenticated reviewer
   approves cards 1–3; the author may not self-approve. **⛔ separate approval.**
6. **Publish eligible approved Originals** — `moderate_content(..., 'approve')` for
   the link-checked, approved cards (two-reviewer rule for high-impact), by a
   moderator who is not the author. **⛔ separate approval (first publication).**
7. **Verify public feed** — after publishing, open `/learn` as a guest; the
   published cards appear (the feed + RLS already serve `published` to everyone).
   (read-only)

## 5. Quality gates (this phase, exact)

| Gate | Kind | Result |
|---|---|---|
| typecheck | static | **PASS** |
| lint | static | **PASS** |
| `npm test` | mocked/unit | **PASS — 383 passed, 6 skipped** (the live audit skips without FACTORY_LIVE) |
| `npm run test:db` | **real local PostgreSQL** | **PASS — 31 files, 497 assertions, 0 failed** |
| build | build | **PASS** |
| hygiene | static | **PASS — 426 files** |
| Batch-1 live evidence audit | **real read-only retrieval** | ran under FACTORY_LIVE=1: 8/10 retrieved, 0 machine-supported, 0 publishable |
| Hosted verification | hosted | **NONE** (no anon key) — unverified, owner SQL provided |

## 6. Final summary

- **Hosted verification status:** unverified here; owner must run §1 SQL to confirm
  the Originals exist on dev (they may not — the seed is not a migration) and that
  nothing is published.
- **Legitimately publishable now:** **none** — 0 link-checked, 0 approved; 2 sources
  need re-checking.
- **Outstanding owner actions:** confirm inventory → (import seed if absent) →
  link-check → human evidence review → second high-impact reviewer → publish. Each
  hosted write is a separate approval.
- **Test results:** all local gates green; no code change was required.
- **Safest next step toward the first public Original:** run the §1 **read-only**
  hosted inventory SQL and confirm the state (10 draft / 0 published, or 0 cards).
  That single read-only step decides whether the next approval is "import the seed"
  or "begin link-checking" — and it exposes no data and changes nothing.
