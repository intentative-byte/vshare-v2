# VSHARES — Phase 10.17: Hosted Originals Verification

- **Date:** 2026-11-22 · **Branch:** `claude/gallant-mendel-xey567`
- Read-only audit + workflow. **No hosted writes, no import, no publication, no
  approval, no role/RLS change, no secrets.** The owner confirmed hosted dev holds
  **exactly 10 draft content items** — the seed is present; **no re-import.**

## 1. Hosted inventory — confirmed (owner), matched here

Owner confirmation (Supabase SQL editor): **10 draft content items** on hosted dev.
This matches the local batch-1 reference exactly, so the ten hosted drafts are the
ten batch-1 Originals. To map them one-to-one (read-only, no writes):

```sql
select slug, status, is_high_impact, (link_checked_at is not null) as link_checked
from public.content_items order by is_high_impact desc, slug;
-- expect the ten slugs below, all status=draft, link_checked=false
```

## 2–5. Ten-card verification matrix (claim-by-claim, real read-only retrieval)

Evidence is from a **real read-only live retrieval + the support classifier** — a
reachable link is **never** a verified claim. Every batch-1 claim classified as
`insufficient_evidence`: the takeaways are faithful **editorial paraphrases** of
reputable sources (NHS, NCSC, GOV.UK, …), so the machine cannot confirm them
verbatim — this means **a human must ground each claim**, not that the claim is
false. Full packs: `docs/samples/originals-batch-1-release-readiness.json`;
source-alternative probe: `docs/samples/originals-batch-1-source-alternatives.json`.

| # | Slug · category | HI | Qual | Source retrieval | Claim 1 | Claim 2 | Link check | Reviewers | Evidence gap |
|---|---|---|---|---|---|---|---|---|---|
| 1 | building-a-first-monthly-budget · finance | **H** | 85 | **robots-disallowed** → alt found | insufficient | insufficient | ❌ | **2** | source + grounding |
| 2 | getting-to-sleep-nhs-guidance · health | **H** | 90 | ok | insufficient | insufficient | ❌ | **2** | grounding |
| 3 | spotting-financial-scams · finance | **H** | 85 | ok | insufficient | insufficient | ❌ | **2** | grounding |
| 4 | asking-for-your-own-data · tech | — | 85 | **http_error 404** → alt found | insufficient | insufficient | ❌ | 1 | source + grounding |
| 5 | machine-learning-crash-course · tech | — | 85 | ok | insufficient | insufficient | ❌ | 1 | grounding |
| 6 | preparing-for-an-interview · career | — | 80 | ok | insufficient | insufficient | ❌ | 1 | grounding |
| 7 | setting-up-a-business-uk · entrepreneurship | — | 80 | ok | insufficient | insufficient | ❌ | 1 | grounding |
| 8 | spaced-repetition-for-memory · learning | — | 85 | ok | insufficient | insufficient | ❌ | 1 | grounding |
| 9 | staying-secure-online-basics · tech | — | 90 | ok | insufficient | insufficient | ❌ | 1 | grounding |
| 10 | writing-people-understand · communication | — | 85 | ok | insufficient | insufficient | ❌ | 1 | grounding |

"insufficient" = the retrieved page did not textually confirm our paraphrase; a
human reviewer reading the source can still judge it faithful. **No contradictions**
were found on any card. **0 cards are link-checked or approved → 0 publishable.**

## 4. The two inaccessible sources — reputable alternatives (investigated live)

| Card | Original (inaccessible) | Accessible reputable alternative (verified retrievable) | Note |
|---|---|---|---|
| 1 · budget | MoneyHelper budget-planner — **robots-disallowed** (blocks automated fetch only) | **Citizens Advice — "Work out your budget"** (`https://www.citizensadvice.org.uk/debt-and-money/budgeting/budgeting/work-out-your-budget/`) — 200, 21 passages | A human can still read MoneyHelper; swap only if an automatable source is preferred |
| 4 · your own data | ICO "your right to get copies" — **HTTP 404** | **GOV.UK — "Data protection"** (`https://www.gov.uk/data-protection`) — 200, 13 passages | The ICO URL (and a second ICO path) 404'd — the original link looks broken; GOV.UK is a solid replacement |

Both alternatives are reputable and retrievable; neither textually confirms the
paraphrased claims either, so a **source swap resolves accessibility, not the
grounding gap**. Changing a card's source is a **content revision = hosted write**,
held for separate approval.

## 6. Which cards can proceed vs need rewriting / more evidence

- **All ten can proceed to HUMAN editorial review now** — that is exactly what the
  review is for: a human grounds each claim against its source. None is
  machine-verified, and none should be approved without that human grounding.
- **Cards 1 and 4 additionally need a source decision first:** either (a) the
  reviewer confirms the original is readable/appropriate (MoneyHelper is reputable;
  the ICO 404 means card 4 almost certainly needs a swap), or (b) swap to the
  accessible alternative above (a content revision — separate approval). Card 4's
  broken link makes a swap the likely outcome.
- **Rewriting vs grounding:** no claim was *contradicted*, so none *must* be
  rewritten for accuracy on the evidence seen; the work is grounding (and, where a
  reviewer finds the paraphrase imprecise, a clearer rewrite). High-impact cards 1–3
  need **two distinct** reviewers.

## 7. Exact approved workflow (DO NOT execute without separate approval)

Each step is an **owner-authorised hosted write**; nothing here is run.

1. **(If swapping sources)** update cards 1 & 4 to the accessible source via a new
   content revision (`add_card_version` / the admin card editor). ⛔ *approval.*
2. **Link-check** (sets `link_checked_at`; `record_link_check` is service-role only):
   ```bash
   DATABASE_URL="<dev DIRECT connection>" npm run check:links   # owner machine, dev only
   ```
   ⛔ *separate approval — hosted write.*
3. **Human editorial review** in `/admin/editorial` as an authenticated moderator:
   for each card, ground every claim against its source, then record a decision
   (Approve / Request revision / Reject). Identity + timestamp are server-set.
   ⛔ *separate approval — hosted write.*
4. **Independent second review** for cards 1–3 (high-impact): a second, distinct
   authenticated reviewer approves; the author may not self-approve. ⛔ *approval.*
5. **Publish** the link-checked, approved cards via `moderate_content(..., 'approve')`
   by a moderator who is not the author (two-reviewer rule enforced for high-impact).
   ⛔ *separate approval — first publication.*
6. **Verify** `/learn` as a guest — published cards now appear. (read-only)

No step bypasses RLS, the staff gate, the two-reviewer quorum, or the link-check
publication gate.

## Quality gates (this phase, exact)

| Gate | Result |
|---|---|
| typecheck | **PASS** |
| lint | **PASS** |
| `npm test` | **PASS — 384 passed, 7 skipped** (live tests gated) |
| `npm run test:db` | **PASS — 31 files, 497 assertions, 0 failed** |
| build | **PASS** |
| hygiene | **PASS — 430 files** |
| Live source-alternative probe | ran read-only under FACTORY_LIVE=1 |
| Hosted verification | owner-confirmed inventory only; no hosted read/write by this session |

## Final summary

- **Ten-card matrix:** above. All draft, all link-unchecked, all claims machine-
  `insufficient` (need human grounding), **0 contradictions**, 3 high-impact.
- **Remaining evidence gaps:** every card needs human claim-grounding; cards 1 & 4
  need a source decision (card 4's ICO link is broken → likely swap to GOV.UK).
- **Link-check recommendations:** proceed for the 8 accessible cards; for cards 1 & 4
  decide the source first (Citizens Advice / GOV.UK alternatives verified accessible).
- **Reviewer counts:** 7 cards need 1 reviewer; **3 high-impact need 2 distinct**.
- **Safest next owner-authorised action:** with the admin logged in, do a
  **read-only human review pass** in `/admin/editorial` — read each card's claims
  against its source and note grounding/source decisions — **before** any hosted
  write. It changes nothing and produces the judgement the first writes depend on.
  The first *write* should then be the link-check (step 2), after the card-1/4
  source decision.
