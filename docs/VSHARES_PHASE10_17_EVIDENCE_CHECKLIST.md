# VSHARES — Ten-card editorial evidence checklist (Phase 10.17)

- **Date:** 2026-11-22 · For **human reviewers**. **No content approved, no hosted
  write, no publication.** Passages are REAL excerpts from the retrieved sources
  (read-only, robots-respected); none is invented, and **no claim is marked
  verified** — the classifier confirmed none automatically, so each needs a human.
- Verbatim passages + full data: `docs/samples/originals-batch-1-evidence-sheets.json`.
- "Candidate evidence" = the nearest real passage on the page; it is a **starting
  point for a human**, not a verification. Overlap is a textual hint only.

## Owner source decisions (applied here)

1. **Card 1 (budget):** MoneyHelper **retained provisionally**. It blocks automated
   fetch via robots.txt (not proof the human link is broken) → **flagged for MANUAL
   verification** by the reviewer in a browser.
2. **Card 4 (your own data):** evaluated the proposed **GOV.UK /data-protection**
   source against the card's specific claims. **Result: it does NOT support them** —
   the retrieved page is the overview (navigation + "data protection principles" +
   cookie notices); the subject-access detail lives on a **deeper GOV.UK subpage**
   ("Find out what data an organisation has about you"). **Do not propose this swap
   as-is.** Recommended: point card 4 at the specific GOV.UK SAR subpage (or a
   working ICO page) and re-verify before any change. **No hosted content modified.**
3. **Cards 2, 3, 5–10:** claim-by-claim sheets below, with real passages.

## Checklist (claim → evidence/gap → source → reviewer action)

Legend: **[S]** strong candidate passage (likely confirmable) · **[W]** weak/loose ·
**[∅]** no overlapping passage found · **[M]** source needs manual fetch.

### 1. building-a-first-monthly-budget — Personal Finance — HIGH-IMPACT (2 reviewers)
Source: `https://www.moneyhelper.org.uk/.../budget-planner` — **[M] robots-disallowed**
- Claim: "Writing fixed costs down is what makes them negotiable." → **[M]** open the
  source in a browser and confirm; otherwise consider Citizens Advice "Work out your budget".
- Claim: "A budget is a plan for money you have, not a prediction of money you might get." → **[M]** same.
- **Reviewer action:** manually read MoneyHelper; confirm both claims; **second reviewer** required.

### 2. getting-to-sleep-nhs-guidance — Health — HIGH-IMPACT (2 reviewers)
Source: NHS "How to get to sleep" — retrieved ok
- Claim: "A consistent wake time does more for sleep than a consistent bedtime." → **[∅]** no passage overlapped; the NHS page may word this differently or not at all → **human must confirm or rewrite to match NHS wording.**
- Claim: "Persistent sleep problems are worth raising with a doctor rather than managing alone." → **[∅]** confirm against the NHS page's "see a GP" guidance.
- **Reviewer action:** read NHS source; likely **rewrite claim 1** to what NHS actually says; **second reviewer** required.

### 3. spotting-financial-scams — Personal Finance — HIGH-IMPACT (2 reviewers)
Source: Take Five to Stop Fraud — retrieved ok
- Claim: "Urgency is the common thread in almost every scam." → **[W]** nearest: *"Find out more about common types of scams and how you can protect yourself."* → confirm the "urgency" framing on the site.
- Claim: 'No legitimate organisation asks you to move money to a "safe account".' → **[W]** nearest: *"We will never text or call you and ask you to share your information or transfer money."* → **close**; confirm the "safe account" specificity.
- **Reviewer action:** confirm both against Take Five; **second reviewer** required.

### 4. asking-for-your-own-data — Technology & AI — (1 reviewer)
Source: ICO original **404 (broken)**; proposed GOV.UK overview **does not support the claims** (see owner decision 2)
- Claim: "You can ask any organisation for a copy of the personal data it holds about you." → **[W]** GOV.UK overview nearest: *"data protection principles"* / *"Find out what data an organisation has about you"* (a link, not the statement) → use the **deeper SAR subpage** and confirm.
- Claim: "A request does not have to use any particular wording or form." → **[∅]** not on the overview page → confirm on the SAR subpage (ICO/GOV.UK state a SAR can be made verbally or in writing).
- **Reviewer action:** **choose a specific SAR source** (GOV.UK subpage or working ICO page), then confirm both claims; this is the one card needing a **source fix first**.

### 5. machine-learning-crash-course — Technology & AI — (1 reviewer)
Source: Google ML Crash Course — retrieved ok
- Claim: "Training a model means adjusting it until its predictions match known answers closely enough." → **[W]** nearest: *"...analyze and transform numerical data to help train ML models..."* → confirm against a course module.
- Claim: "Most of the work in practice is preparing data, not choosing an algorithm." → **[W]** nearest: *"...fundamental techniques and best practices for working with machine learning data."* → plausible; confirm.
- **Reviewer action:** confirm both against the course text.

### 6. preparing-for-an-interview — Career — (1 reviewer)
Source: National Careers Service — retrieved ok
- Claim: "A structured answer about a real situation beats a general claim about yourself." → **[W]** nearest refers to the STAR "method" / example answers → confirm.
- Claim: "The questions you ask are part of what is being assessed." → **[W]** nearest: *"Common interview questions and answers..."* → confirm the "questions you ask" point on the page.
- **Reviewer action:** confirm both.

### 7. setting-up-a-business-uk — Entrepreneurship — (1 reviewer)
Source: GOV.UK "Set up a business" — retrieved ok
- Claim: "The legal structure you choose changes your tax and your personal liability." → **[S]** nearest (ov 0.57): *"The business structure you choose can affect the way you pay tax and your legal responsibilities."* → **strongly supported**; confirm wording.
- Claim: "Registration deadlines start from when you begin trading, not when you incorporate." → **[W]** nearest: *"When you start trading you must keep records."* → confirm the deadline specificity.
- **Reviewer action:** claim 1 likely confirmable as-is; verify claim 2's "deadline" detail.

### 8. spaced-repetition-for-memory — Learning how to learn — (1 reviewer)
Source: augmentingcognition.com — retrieved ok
- Claim: "Reviewing just before you would have forgotten is what strengthens memory." → **[W]** nearest is general ("augment human memory") → confirm the spacing detail in the essay.
- Claim: "A prompt that can be answered without understanding teaches you nothing." → **[W]** confirm against the essay's Anki guidance.
- **Reviewer action:** confirm both against the (long) essay.

### 9. staying-secure-online-basics — Technology & AI — (1 reviewer)
Source: NCSC "Top tips for staying secure online" — retrieved ok
- Claim: "Protecting the email account that can reset every other password matters most." → **[W]** nearest mentions 2-step verification → confirm the "email first" emphasis (NCSC does stress this).
- Claim: "A password manager removes the need to remember or reuse passwords." → **[S]** nearest (ov 0.57): *"Password managers: how they help you secure passwords — ...create and remember password..."* → **strongly supported**.
- Claim: "Two-factor authentication blocks most attacks that start with a stolen password." → **[W]** confirm the "blocks most attacks" strength of claim against NCSC wording.
- **Reviewer action:** claim 2 confirmable; verify claims 1 & 3 for faithful strength.

### 10. writing-people-understand — Communication — (1 reviewer)
Source: GOV.UK "Writing for GOV.UK" — retrieved ok
- Claim: "Write for the person with the least time and the most to lose." → **[∅]** no overlapping passage → this is an editorial aphorism; **confirm it reflects GOV.UK guidance or rewrite** to a supported statement.
- Claim: "Shorter sentences are not simpler ideas, only clearer ones." → **[∅]** same → confirm/rewrite.
- **Reviewer action:** likely **rewrite** both to statements the GOV.UK page actually supports (e.g. on plain English / sentence length).

## Summary for the reviewer

- **21 claims across 10 cards; 0 auto-verified; all 21 need human grounding.** No
  claim was *contradicted*.
- **Strongest candidate evidence (likely confirmable as-is):** card 7 claim 1, card 9
  claim 2.
- **Likely need rewriting to match the source:** card 2 claim 1, card 10 claims 1–2
  (aphorisms with no matching passage).
- **Source fix needed first:** card 4 (pick a specific SAR page). Card 1 needs a
  manual browser check (robots-blocked to the fetcher only).
- **Reviewer counts:** cards 2, 3, 1 (high-impact) → **2 distinct reviewers** each;
  cards 4–10 → 1 reviewer.

## Next owner decision required

**Card 4's source.** The proposed GOV.UK /data-protection overview does **not**
support the card's specific SAR claims, so the swap is **not** recommended as-is.
Please choose one, so I can prepare (not execute) the exact revision + re-verify:
- **(a)** the specific GOV.UK SAR subpage (e.g. "Find out what data an organisation
  has about you"), or
- **(b)** a working ICO subject-access page, or
- **(c)** keep the current ICO URL and treat the 404 as a transient fetch error for
  a human to re-check in a browser.

Everything else is ready for the **read-only human review pass** in `/admin/editorial`
(no writes); the first hosted write remains the link-check, held for separate approval.
