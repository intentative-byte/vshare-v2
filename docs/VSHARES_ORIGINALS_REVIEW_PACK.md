# VSHARES Originals — human editorial review pack (batch 1)

- **Date:** 2026-11-18 · For **human reviewers**. **No card is approved or
  published.** Evidence is real; no quote, citation or verification is fabricated.
  A reachable URL is never treated as proof of a claim.
- **Statuses (only these):** `READY FOR HUMAN REVIEW` (agent found no blocker; a
  human still reviews and approves) · `REVISION REQUIRED` · `EVIDENCE BLOCKED`.
  **READY does not mean approved.**

## Task 6 — remote read-only state (distinguished from local seed data)
This session has **no anon key and no DB route to the hosted dev project**, so it
**cannot read the hosted `content_items`/`content_media`**. The baseline evidence
in this pack ("10 draft, 0 published") is from a **fresh local apply of the
migrations + seeds**, which is the *expected* starting state, **not** a reading of
the hosted database. The owner should confirm the hosted catalogue with the
read-only SQL in `VSHARES_GATE1_EXECUTION_PLAN.md`. No credentials requested.

## Task 4 — high-impact independent second-review checklist
Applies to **Card 1 (Personal Finance)** and **Card 3 (Health)**. **The generating
agent is NOT an independent reviewer and does not count as one. Do not
self-approve.**
- [ ] A reviewer **other than the author/agent** has reviewed the card.
- [ ] Every factual claim is checked against an authoritative source **by a human**.
- [ ] "Educational, not advice" framing present; professional signposting present
      (finance: not financial advice; health: see a doctor / not medical advice).
- [ ] No overstated certainty (see the per-card corrections below).
- [ ] The DB will refuse self-approval of high-impact content — a second moderator
      approves at publish time.

## Claim evidence legend
Each claim: **supports?** = does the cited evidence *directly* support it ·
**confidence** = high / medium / low · **method** = how it was checked.

---

## Card 1 — A first monthly budget · Personal Finance · beginner · **HIGH-IMPACT**
**Proposed copy (revised):** Hook "You can't manage what you haven't written
down." Objective: build a first monthly budget. Explanation: a free, government
-backed budgeting tool lists income and fixed costs so you can see what's left —
general information, not financial advice. Takeaway: list every fixed monthly
cost this week.

**Claim-by-claim:**
| Claim | Source · authority | Evidence / method | Supports? | Qualifying | Confidence | Decision |
|---|---|---|---|---|---|---|
| Writing costs down helps you manage/negotiate them | MoneyHelper (gov-backed) | **source robots-DISALLOWED — not crawl-verified**; this is practical advice, not an empirical finding | not independently verified | it is a reasonable tip, not a proven fact | low (as a "fact") | **reword as advice; verify source manually or cite GOV.UK** |
| A budget plans money you have, not money you might get | — | definitional framing | n/a (definition) | — | n/a | keep as framing |

**Outstanding concerns:** MoneyHelper's page is robots-blocked, so claims could
not be crawl-verified; a crawlable alternative is **GOV.UK "Get help with money"
/ debt advice** (retrieved live in Phase 10.3). The first claim was reworded from
a factual assertion to advice. **Media:** none.
**Status: REVISION REQUIRED** (reword done; a human confirms the source manually
or swaps to the GOV.UK source; high-impact second review).
**Reviewer sign-off:** reviewer ___ · date ___ · second reviewer ___ · decision ___

---

## Card 2 — Secure your main accounts · Technology/Cybersecurity · beginner
**Proposed copy:** unchanged. Takeaways: use a strong, separate email password;
turn on two-factor authentication.
| Claim | Source · authority | Evidence / method | Supports? | Confidence | Decision |
|---|---|---|---|---|---|
| Use a strong, separate password for email | NCSC (UK national authority) | NCSC's own "top tips" (retrieved live, 11 passages) | yes (authoritative recommendation) | high | keep |
| Turn on 2FA for important accounts | NCSC | same | yes | high | keep |
**Outstanding:** confirm wording matches NCSC. **Media:** none.
**Status: READY FOR HUMAN REVIEW.** Sign-off: reviewer ___ · date ___

---

## Card 3 — Getting to sleep · Health & Wellbeing · beginner · **HIGH-IMPACT**
**Proposed copy (revised):** Hook "Regular sleep timing does more than chasing
hours." Objective: apply evidence-led sleep basics. Takeaways (revised): **"Keeping
a regular sleep schedule is linked to better health; a consistent wake time is a
good anchor for your body clock."** · "Persistent sleep problems are worth raising
with a doctor." Framing: general information, not medical advice.
| Claim | Source · authority | Evidence / method | Supports? | Qualifying | Confidence | Decision |
|---|---|---|---|---|---|---|
| ~~A consistent wake time does more for sleep than a fixed bedtime~~ (ORIGINAL) | NHS (page JS-blocked) | web research: **no head-to-head study**; some evidence favours bedtime | **NO — overstated** | regularity overall is what's supported | — | **REVISED/REMOVED** |
| A regular sleep schedule is linked to better health | UK Biobank (~60k) regularity study; 2025 systematic review | independent academic literature | yes | association, not proof of causation | medium–high | keep (revised) |
| A consistent wake time is a good circadian anchor | clinical/sleep-science sources (VA protocol; Cambridge Sleep Sciences) | practitioner/clinical | yes, as an anchor | not "more than bedtime" | medium | keep (revised) |
| Persistent sleep problems → see a doctor | NHS | standard NHS guidance | yes | — | high | keep |
**Outstanding:** NHS source is JS-rendered (no extractable text) → **verify the
NHS wording manually**. The overstated wake-vs-bedtime claim was corrected to
avoid asserting unproven certainty. **Media:** none.
**Status: REVISION REQUIRED** (claim corrected; NHS source needs manual
verification; high-impact second review). Sign-off: reviewer ___ · 2nd ___ · date ___

---

## Card 4 — What a neural network is · Technology & AI · beginner · **hosts 3Blue1Brown NN video**
**Proposed copy:** unchanged.
| Claim | Source · authority | Evidence / method | Supports? | Confidence | Decision |
|---|---|---|---|---|---|
| Training adjusts a model until predictions match known answers | Google ML Crash Course | authoritative course (retrieved live, 37 passages); standard definition of supervised training | yes | high | keep |
| Most practical work is preparing data, not choosing an algorithm | widely held in ML practice | general field consensus | yes (widely accepted) | medium–high | keep |
**Media:** 3Blue1Brown "But what is a neural network?" — legitimate same-topic
parent. **Status: READY FOR HUMAN REVIEW.** Sign-off: reviewer ___ · date ___

---

## Card 5 — Preparing for an interview · Career · beginner
**Proposed copy:** unchanged. Claims (research first; structured STAR answers;
your questions are assessed) are **National Careers Service** guidance (authoritative;
retrieved live, 40 passages). **Media:** none. **Status: READY FOR HUMAN REVIEW.**
Sign-off: reviewer ___ · date ___

---

## Card 6 — Writing people understand · Communication · beginner
**Proposed copy:** unchanged. Claims (write for the least-time reader; shorter
sentences are clearer) are **GOV.UK/GDS** style principles (authoritative; page
JS-heavy, 1 passage — **confirm wording manually**). **Media:** none.
**Status: READY FOR HUMAN REVIEW** (confirm GDS wording). Sign-off: reviewer ___ · date ___

---

## Card 7 — The essence of calculus · Learning · beginner · **hosts 3Blue1Brown calculus video**
**Proposed copy:** unchanged copy; **source note added**.
| Claim | Source · authority | Evidence / method | Supports? | Confidence | Decision |
|---|---|---|---|---|---|
| Calculus is about how things change and how changes accumulate | standard mathematical definition (derivatives/integrals) | definitional | yes (definition) | high | keep |
| Intuition before the rules makes them easier to learn | pedagogical view (the video's thesis) | opinion/pedagogy | reasonable, not empirical | medium | keep as pedagogy |
**Outstanding:** Khan Academy source is a JS SPA (no extractable text) → **add or
confirm a crawlable text source** (e.g., OpenStax Calculus) or verify manually.
**Media:** 3Blue1Brown "The essence of calculus" — legitimate parent.
**Status: REVISION REQUIRED** (confirm/add a crawlable source). Sign-off: reviewer ___ · date ___

---

## Card 8 — Reading the evidence on black holes · Science · beginner · **hosts Kurzgesagt video**
**Proposed copy:** unchanged; **open-problem framing required for the video**.
| Claim | Source · authority | Evidence / method | Supports? | Confidence | Decision |
|---|---|---|---|---|---|
| A black hole is a region gravity so strong nothing, not even light, escapes | NASA | **VERIFIED** against a retrieved NASA passage (overlap match) | yes | high | keep |
| Much about black holes is still an open research question | NASA + physics literature | the information paradox is **unresolved** (independent web research, Gate 2) | yes | high | keep |
**Outstanding:** the hosted video is about the **information paradox**, which is
**unresolved** — present it as an **open question**, not settled.
**Media:** Kurzgesagt "Why Black Holes Could Delete The Universe" — legitimate
parent; frame as open. **Status: READY FOR HUMAN REVIEW.** Sign-off: reviewer ___ · date ___

---

## Card 9 — Perseverance, and the limits of "grit" · Personal development · beginner · **hosts TED/Duckworth video**
**Proposed copy:** unchanged (the card deliberately carries the critique).
| Claim | Source · authority | Evidence / method | Supports? | Confidence | Decision |
|---|---|---|---|---|---|
| Grit overlaps heavily with conscientiousness | Credé, Tynan & Harms (2017), JPSP meta-analysis (~88 studies) | independent academic literature (Gate 2 research) | yes | high | keep |
| Its independent effect on success is small | same meta-analysis | independent | yes | medium–high | keep |
**Outstanding:** prefer citing the **primary papers** over Wikipedia at approval.
**Media:** TED "Grit" — legitimate parent; the card provides the balancing
evidence the talk omits. **Status: READY FOR HUMAN REVIEW.** Sign-off: reviewer ___ · date ___

---

## Card 10 — Starting to program with Python · Technology · beginner · **hosts freeCodeCamp video**
**Proposed copy:** unchanged.
| Claim | Source · authority | Evidence / method | Supports? | Confidence | Decision |
|---|---|---|---|---|---|
| Python is designed to be readable, which helps beginners | Python Software Foundation docs; the language's stated design goals | authoritative (retrieved live, 38 passages) | yes | high | keep |
| You learn to program by writing small programs | general programming pedagogy | widely accepted | yes | medium–high | keep |
**Media:** freeCodeCamp "Learn Python" — legitimate parent. **Status: READY FOR
HUMAN REVIEW.** Sign-off: reviewer ___ · date ___

---

## Summary
| Card | Status | High-impact | Media parent | Key outstanding concern |
|---|---|---|---|---|
| 1 Budget | **REVISION REQUIRED** | yes | — | robots-blocked source; verify manually / use GOV.UK |
| 2 Security | READY FOR HUMAN REVIEW | no | — | confirm NCSC wording |
| 3 Sleep | **REVISION REQUIRED** | yes | — | overstated claim corrected; NHS page JS-blocked |
| 4 Neural network | READY FOR HUMAN REVIEW | no | 3B1B NN | — |
| 5 Interview | READY FOR HUMAN REVIEW | no | — | — |
| 6 Writing | READY FOR HUMAN REVIEW | no | — | confirm GDS wording (JS page) |
| 7 Calculus | **REVISION REQUIRED** | no | 3B1B calculus | Khan JS SPA; add crawlable source |
| 8 Black holes | READY FOR HUMAN REVIEW | no | Kurzgesagt | frame paradox as open |
| 9 Grit | READY FOR HUMAN REVIEW | no | TED Grit | prefer primary papers |
| 10 Python | READY FOR HUMAN REVIEW | no | freeCodeCamp | — |

**7 READY FOR HUMAN REVIEW · 3 REVISION REQUIRED · 0 EVIDENCE BLOCKED.** No card is
approved. High-impact cards (1, 3) require an independent second reviewer. All
five videos have a legitimate parent. Evidence provenance:
`docs/samples/originals-evidence.json`.
