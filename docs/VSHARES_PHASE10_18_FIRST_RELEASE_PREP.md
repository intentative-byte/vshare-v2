# VSHARES — Phase 10.18: First Original Release Preparation

- **Date:** 2026-11-22 · **Preparation & verification only — NO hosted write, no
  content modified, no approval, no publication.** Passages are real excerpts from
  read-only retrieval; nothing is auto-verified. Data:
  `docs/samples/originals-card7-verification.json`, `…-card4-source.json`.

## Task 1 — Card 7 (`setting-up-a-business-uk`) claim-by-claim verification

Source: GOV.UK **"Set up a business"** (`https://www.gov.uk/set-up-business`),
retrieved OK (200, 49 passages); cross-checked against GOV.UK "Set up as a sole
trader".

### Claim 1 — "The legal structure you choose changes your tax and your personal liability." → **VERIFIED (supported)**
- GOV.UK: *"The business structure you choose can affect the way you pay tax and
  your legal responsibilities."*
- GOV.UK (liability): *"Sole trader businesses have 'unlimited liability' which means
  owners are personally responsible for all of the debts of the business."*
- The structure demonstrably affects both tax treatment and personal liability.
  **Keep as-is.**

### Claim 2 — "Registration deadlines start from when you begin trading, not when you incorporate." → **NOT ACCURATE across structures → must be corrected**
Reading the authoritative source across the structures it covers:
- **Sole trader:** *"You can start trading straight away without registering.
  However, you must register for Self Assessment as a sole trader if you earn more
  than £1,000 in a tax year."* → registration is tied to trading/earnings (there is
  no "incorporation"). Consistent with the claim.
- **Limited company:** *"Company owners need to register the company **before** they
  start trading."* · *"You'll register when setting up as a limited company."* →
  **the company is registered at/for incorporation, BEFORE trading** — the opposite
  of the claim.
- **Conclusion:** the claim is **false for limited companies** and the source itself
  contradicts it. It must not be marked verified.

### Proposed smallest accurate revision for Claim 2 (source-grounded)
> *"When you must register depends on your structure: a sole trader can start
> trading before registering for Self Assessment, but a limited company must be
> registered before it starts trading."*

Both halves are directly supported by the GOV.UK passages above. This is a content
revision (a new immutable version) — **held for separate approval; not executed.**

**Card 7 readiness:** claim 1 is verified; **claim 2 requires the correction above
before Card 7 can go to human editorial approval.** After the corrected revision,
Card 7 is the strongest first candidate (standard-impact, authoritative source).

## Task 2 — Card-7-only link-check procedure (prepared, NOT executed)

`npm run check:links` (`scripts/check-links.mjs`) reads **every** card in
`('draft','pending','published')` and records a link-check for **each** — it has
**no single-card filter**, so running it would modify the other nine drafts. It is
therefore **unsuitable** for a Card-7-only check.

**Card-7-only approach — `record_link_check` on one id:**
- `public.record_link_check(p_content_id, p_reachable)` sets
  `link_checked_at = now()` (when reachable) for **exactly that one card** and writes
  an audit entry `card.link_check`. It is **service-role only** (revoked from
  public/anon/authenticated).

| Item | Value |
|---|---|
| Precondition | Confirm `https://www.gov.uk/set-up-business` is reachable (it returned **200** on retrieval). Resolve Card 7's id (read-only): `select id from public.content_items where slug='setting-up-a-business-uk';` |
| **Exact command** (owner, dev DIRECT connection / service role) | `select public.record_link_check('<card7-id>'::uuid, true);` |
| Expected DB change | `content_items.link_checked_at` set to `now()` for Card 7 **only**; one `audit_log` row (`card.link_check`, `reachable=true`). No other card touched. No publication. |
| Permissions required | **service_role** (or the dev DB owner). Not available to `authenticated`/`anon`. |
| Verify | `select slug, link_checked_at from public.content_items where slug='setting-up-a-business-uk';` (should be non-null); `select slug, (link_checked_at is not null) from public.content_items order by slug;` (the other nine still **false**). |
| Rollback / correction | `select public.record_link_check('<card7-id>'::uuid, false);` (resets `link_checked_at` to null) — or `update public.content_items set link_checked_at=null where id='<card7-id>';` (service role). This re-closes the publish gate. |

**⛔ This is a hosted write — do not run without separate explicit approval. Do the
Card 7 claim-2 correction first, so the link-check applies to the corrected card.**

## Task 3 — Editorial review readiness (read-only; no decision recorded)

Hosted state cannot be read from this session (no anon key). The owner confirms
Card 7 is a **draft**. Read-only confirmation (Supabase SQL editor):
```sql
select ci.id, ci.slug, ci.status, ci.is_high_impact, ci.submitted_by,
       ci.current_version_id, ci.link_checked_at,
       (select count(*) from public.editorial_decisions d where d.content_id=ci.id) as decisions
from public.content_items ci where ci.slug='setting-up-a-business-uk';
```
Expected: status `draft`, `is_high_impact=false`, **`submitted_by` NULL** (seeded
cards have no author), a non-null `current_version_id`, `link_checked_at` null,
`decisions=0`.

- **Impact:** standard → **one** reviewer is sufficient (no two-person rule).
- **Author vs reviewer:** `submitted_by` is NULL, so any staff reviewer, and any
  publishing moderator, is trivially **not the author**. (The DB's self-approval
  block applies only to high-impact cards anyway.)
- **Reviewer eligibility:** any authenticated `moderator`/`admin` may review;
  identity + timestamp are server-set via `record_editorial_decision`.

### Human review checklist (Card 7) — to perform in `/admin/editorial` (no write yet)
1. Confirm claim 1 against GOV.UK (verified above).
2. Confirm the **corrected** claim 2 (apply Task 1 revision first).
3. Confirm the source is the GOV.UK "Set up a business" page and is link-checked.
4. Record **Approve** (or **Request revision** if claim 2 is not yet corrected).
   ⛔ recording a decision is a hosted write — separate approval.

## Task 4 — Card 4 (`asking-for-your-own-data`) proposed corrected revision (NOT executed)

- **New source:** GOV.UK **"Find out what data an organisation has about you"**
  (`https://www.gov.uk/data-protection/find-out-what-data-an-organisation-has-about-you`) — accessible (200).
- **Claim 1 — retained (verified):** supported by *"The organisation must give you a
  copy of the data they hold about you…"* and *"ask an organisation for your
  personal information."*
- **Claim 2 — replaced** (the old "no particular wording or form" is unsupported by
  the page). Proposed **qualified** statement (not unconditional):
  > *"An organisation must usually give you your data within one month — though for
  > particularly complex or multiple requests it can take up to two months longer."*
  - Supported: *"…within 1 month at most."* and *"In certain circumstances, for
    example particularly complex or multiple requests, the organisation can take a
    further 2 months to provide data."*
  - **Exceptions captured:** the "complex/multiple requests → +2 months" exception is
    stated, so the deadline is **not** presented as absolute.
- This is a new immutable revision — **held for separate approval; not executed.**

## Task 5 — First-publication acceptance plan (staged; DB invariants per stage)

| Stage | Action | Hosted write? | Approval | DB invariant / evidence to confirm |
|---|---|---|---|---|
| 1 | **Verify Card 7's claims** (this doc) + apply the claim-2 correction as a new revision | revision = write | ⛔ | `content_versions` gains a new version; `current_version_id` updated; claim 2 now source-supported |
| 2 | **Card-7-only link-check** (Task 2) | yes | ⛔ separate | `link_checked_at` non-null for Card 7 **only**; other nine still null; one `card.link_check` audit row |
| 3 | **Human editorial decision** (Approve) in `/admin/editorial` by an authorised moderator | yes | ⛔ | `editorial_decisions` gains one row (server-set reviewer + timestamp, hash-chained); standard-impact ⇒ `editorial_publication_eligible` may be true with one approver |
| 4 | **Publication approval** | — | ⛔ separate | — |
| 5 | **Publish via `moderate_content(id,'approve')`** by a moderator ≠ author | yes | ⛔ | gate passes only if `link_checked_at` non-null; `status→published`, `published_at` set; **publication refused if link unchecked** |
| 6 | **Verify `/learn` as a signed-out visitor** | read-only | — | Card 7 appears (feed query `status='published'` + RLS `content_items_select_published` serve it to everyone) |
| 7 | **Confirm the other nine remain unpublished** | read-only | — | `select status,count(*) from content_items group by status;` → 1 published, 9 draft |

No stage bypasses the link-check gate, the staff gate, RLS, the append-only audit,
or (for high-impact, not Card 7) the two-reviewer quorum.

## QA (this phase, exact)

| Gate | Result |
|---|---|
| typecheck | **PASS** |
| lint | **PASS** |
| `npm test` | **PASS — 389 passed, 10 skipped** |
| `npm run test:db` | **PASS — 31 files, 497 assertions, 0 failed** |
| build | **PASS** |
| hygiene | **PASS — 439 files** |
| Card 7 live verification | ran read-only under FACTORY_LIVE=1 |

## Final summary

- **Card 7 claim 1:** verified. **Claim 2:** **not accurate** for limited companies
  (source contradicts it) → **correction required** (proposed above).
- **Card 7 ready for human approval?** **Not yet** — only after the claim-2 revision.
  Then it is the strongest first candidate (standard-impact, authoritative source).
- **Card-7-only link-check:** `select public.record_link_check('<card7-id>', true);`
  (service-role), not the all-cards `check:links`. ⛔ separate approval.
- **Card 4:** corrected revision proposed (GOV.UK source; keep claim 1; claim 2 →
  qualified one-month statement with the complex-request exception).
- **Acceptance checklist:** staged above with DB invariants; every write gated.

### The single safest next owner-authorised action
**Apply the Card 7 claim-2 correction as a new immutable revision** (Stage 1) — it
fixes a real factual error, changes no publication state, needs no second reviewer,
and is the prerequisite for everything after it. (Equivalently, if you prefer no
write at all yet: do the **read-only** Card 7 state query in Task 3 and the
`/admin/editorial` read-only review pass first.)
