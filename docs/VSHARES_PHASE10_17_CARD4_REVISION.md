# VSHARES — Card 4 source revision (proposed) + nine-card prioritisation

- **Date:** 2026-11-22 · **Proposed only — NO hosted content modified**, no approval,
  no publication. Passages are real excerpts (read-only retrieval); nothing is
  auto-verified. Data: `docs/samples/originals-card4-source.json`.

## Card 4 — `asking-for-your-own-data`

### Source investigation (owner option A)

My first two URL guesses 404'd; the **correct canonical pages** (found via search,
then verified by live retrieval) are both **accessible (HTTP 200)**:

| Candidate | Status | Verdict |
|---|---|---|
| **GOV.UK — "Find out what data an organisation has about you"** `https://www.gov.uk/data-protection/find-out-what-data-an-organisation-has-about-you` | **200, 13 passages** | **Recommended source** |
| ICO — "Make a subject access request" `https://ico.org.uk/for-the-public/make-a-subject-access-request` | 200, 13 passages | Viable, but it is a "start a request" service page |

### Claim-by-claim result (real passages)

**Claim 1 — "You can ask any organisation for a copy of the personal data it holds
about you."** → **SUPPORTED** (human-confirmable).
- GOV.UK: *"The organisation must give you a copy of the data they hold about you,
  as soon as possible, and within 1 month at most."* · *"If it's a public
  organisation, write to their Data Protection Officer (DPO)."*
- ICO: *"Use this service to ask an organisation for your personal information or
  for the information of someone else, eg a child or relative."*
- (Token overlap 0.43–0.57 is below the machine threshold, but the meaning is
  unambiguous — a reviewer confirms this.)

**Claim 2 — "A request does not have to use any particular wording or form."** →
**NOT SUPPORTED by either page as retrieved.**
- The GOV.UK/ICO passages retrieved cover **response timing** (one month, DPO,
  complex requests) and the ICO's email service — **not** the "no particular
  wording/form" point. That principle exists in deeper ICO guidance, not on these
  pages.

### Proposed revision (for owner approval — not executed)

- **New source:** GOV.UK — "Find out what data an organisation has about you"
  (`https://www.gov.uk/data-protection/find-out-what-data-an-organisation-has-about-you`).
  Reputable, accessible, and it supports claim 1.
- **Claim 1:** keep as-is (supported).
- **Claim 2:** **correct it** — it is not supported by the GOV.UK page. Two honest
  options for the reviewer:
  - **(i) Replace** with a claim the source supports, e.g. *"An organisation must
    give you a copy of your data within one month of your request."* (directly
    supported: the 1-month passage), or
  - **(ii) Keep** the "no particular wording/form" point **only if** a specific ICO
    guidance page stating it is cited and link-checked.
- This is a **content revision = hosted write** (`add_card_version` / the admin card
  editor), **held for separate approval.** No change has been made.

## Nine-card prioritisation for human review

Ranked by strength of real candidate evidence and fewest blockers (full detail:
`docs/VSHARES_PHASE10_17_EVIDENCE_CHECKLIST.md`).

### Tier 1 — strongest candidates (standard-impact, one reviewer, real support)
| Card | Strong evidence | Outstanding |
|---|---|---|
| **7 · setting-up-a-business-uk** | claim 1 ↔ GOV.UK *"The business structure you choose can affect the way you pay tax and your legal responsibilities."* (ov 0.57) | verify claim 2 ("deadlines from trading"); link-check; 1 review |
| **9 · staying-secure-online-basics** | claim 2 ↔ NCSC *"Password managers: how they help you secure passwords…"* (ov 0.57) | verify claims 1 & 3 strength; link-check; 1 review |

### Tier 2 — plausible, need human grounding (standard-impact)
- **5 · machine-learning-crash-course**, **6 · preparing-for-an-interview**,
  **8 · spaced-repetition-for-memory** — on-topic nearest passages; a reviewer
  confirms or lightly rewrites.

### Tier 3 — claims need correction / rewrite before review helps
- **2 · getting-to-sleep-nhs-guidance** *(HIGH-IMPACT, 2 reviewers)* — claim 1
  ("consistent wake time beats consistent bedtime") had **no matching NHS passage**;
  likely needs rewriting to what the NHS page states, then two reviewers.
- **10 · writing-people-understand** — both claims are editorial aphorisms with **no
  matching passage** on the GOV.UK writing page; rewrite to supported statements.

### High-impact (need two distinct reviewers, verify carefully)
- **1 · building-a-first-monthly-budget** — MoneyHelper manual-verify (robots).
- **2 · getting-to-sleep-nhs-guidance** — see Tier 3.
- **3 · spotting-financial-scams** — claim 2 close to Take Five wording; verify.

## Strongest candidate for the FIRST controlled publication

**Card 7 — `setting-up-a-business-uk`.** Why it is the safest first:
- **Standard-impact** → needs **one** reviewer, not two.
- **Accessible, authoritative source** (GOV.UK "Set up a business").
- **Claim 1 is strongly and directly supported** by the GOV.UK text (ov 0.57); claim
  2 has a real on-topic passage to confirm.
- No source fix needed (unlike card 4), no manual-only source (unlike card 1), no
  rewrite needed (unlike cards 2 and 10).

### Exactly what remains to make Card 7 eligible (each an owner-gated hosted write)
1. **Link-check** its source — `record_link_check` via `npm run check:links` on dev.
   ⛔ separate approval.
2. **Human editorial review** in `/admin/editorial`: confirm claim 1 (strong) and
   claim 2 (verify the "registration deadlines start from trading" specificity
   against GOV.UK); record an **approve** decision (or request_revision if claim 2
   is imprecise). ⛔ separate approval.
3. **Publish** via `moderate_content(..., 'approve')` by a moderator who is **not**
   the author (standard-impact ⇒ one reviewer suffices; the link-check gate must be
   satisfied). ⛔ separate approval — the first publication.
4. **Verify** `/learn` as a guest — card 7 appears in the feed.

No step bypasses the link-check gate, the staff gate, RLS, or the quorum rules.

## Quality gates (this phase, exact)

| Gate | Result |
|---|---|
| typecheck | **PASS** |
| lint | **PASS** |
| `npm test` | **PASS — 388 passed, 9 skipped** |
| `npm run test:db` | **PASS — 31 files, 497 assertions, 0 failed** |
| build | **PASS** |
| hygiene | **PASS — 436 files** |
| Card 4 live source probe | ran read-only under FACTORY_LIVE=1 |

## Next owner decision required

**Card 4 claim 2** — choose (i) replace it with the GOV.UK-supported one-month
statement, or (ii) keep it and cite a specific ICO page. Then, independently, you
can authorise the **first publication track for Card 7** (link-check → review →
publish), which is ready and needs no source or rewrite work.
