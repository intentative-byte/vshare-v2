# VSHARES Originals — batch 1 (ten cards, prepared for review)

- **Date:** 2026-11-18 · Prepared for **human editorial review**. Nothing is
  approved or published. Evidence is real (`docs/samples/originals-evidence.json`);
  no quote, citation or verification is fabricated.
- **Reuse:** six cards reuse and improve the existing seed drafts (adding a hook,
  an evidence check and a review requirement); four are new, each a **legitimate
  parent** for one of the candidate videos (Task 4) — not a placeholder.
- **Baseline (DB-verified):** the catalogue holds **10 draft cards, 0 published,
  0 link-checked** (fresh-DB apply of all 9 migrations + seeds). So these
  Originals start as drafts; publication is a later owner gate.

## The ten Originals

Each: hook · objective · explanation · claims · source (+ link/evidence status) ·
takeaway · category/difficulty · quality · freshness · (hosted video, if any).
Evidence status is from the real retrieval; "unsupported" means the retrieved
page did not confirm the paraphrased claim (needs human grounding), not that it
is false.

### 1. A first monthly budget — *Personal Finance · beginner · HIGH-IMPACT*
- **Hook:** "You can't negotiate a cost you've never written down."
- **Objective:** build a first monthly budget from real numbers.
- **Explanation:** a free, government-backed planner for income, fixed costs and
  spending; general information, not advice.
- **Claims:** fixed costs become negotiable once written down; a budget plans
  money you have.
- **Source:** MoneyHelper — `.../budget-planner`. **Link/evidence: BLOCKED** (robots
  disallows crawling; verify the page manually).
- **Takeaway:** list every fixed monthly cost this week.
- **Quality:** source reputable; **evidence incomplete (robots)**. **Freshness:** 6 mo.

### 2. Secure your main accounts — *Technology · Cybersecurity · beginner*
- **Hook:** "Protect the one account that can reset all the others."
- **Objective:** take the few steps that stop most ordinary attacks.
- **Claims:** use a strong, separate email password; turn on two-factor auth.
- **Source:** NCSC top tips. **Link: live (retrieved, 11 passages).** Evidence:
  claims not auto-matched → human to confirm wording.
- **Takeaway:** turn on 2FA for your main email today.
- **Quality:** high; **Freshness:** 6 mo. · Hosts video: —

### 3. Getting to sleep — *Health & Wellbeing · beginner · HIGH-IMPACT*
- **Hook:** "A regular wake time beats a regular bedtime."
- **Objective:** apply evidence-led sleep basics.
- **Claims:** consistent wake time helps most; persistent problems → a doctor.
- **Source:** NHS. **Link: live, but JS-rendered (0 extractable passages)** →
  evidence incomplete; verify manually. **Freshness:** 12 mo. · high-impact.

### 4. What a neural network is — *Technology & AI · beginner* · **hosts the 3Blue1Brown video**
- **Hook:** "Before the maths, see what a network actually does."
- **Objective:** understand how a model is trained and evaluated.
- **Claims:** training adjusts a model to match known answers; most work is data.
- **Source:** Google ML crash course. **Link: live (37 passages).** **Freshness:** 6 mo.

### 5. Preparing for an interview — *Career · beginner*
- **Hook:** "Structure beats confidence in the room."
- **Objective:** prepare structured answers from real experience.
- **Source:** National Careers Service. **Link: live (40 passages).** **Freshness:** 12 mo.

### 6. Writing people understand — *Communication · beginner*
- **Hook:** "Write for the reader with the least time and the most to lose."
- **Objective:** write so people understand the first time.
- **Source:** GOV.UK content design. **Link: live (1 passage; JS-heavy).** **Freshness:** 24 mo.

### 7. The essence of calculus — *Learning how to learn · beginner* · **hosts the 3Blue1Brown calculus video**
- **Hook:** "Calculus makes sense once you see the idea, not the rules."
- **Objective:** build intuition before the mechanics.
- **Source:** Khan Academy calculus. **Link: live, but JS-rendered (0 passages)** →
  evidence incomplete; verify manually. **Freshness:** 24 mo.

### 8. Reading the evidence on black holes — *Science & Nature · beginner* · **hosts the Kurzgesagt video**
- **Hook:** "The strange part isn't the black hole — it's what happens to the information."
- **Objective:** understand what a black hole is, from a primary source.
- **Claims:** a black hole is a region nothing escapes (**VERIFIED** against a
  retrieved NASA passage); much remains an **open** research question.
- **Source:** NASA. **Link: live (38 passages); 1 claim verified.** **Freshness:** 24 mo.
- **Review note:** the hosted video covers the *information paradox*, which is
  **unresolved** — frame as open (see Gate-2 verification).

### 9. Perseverance, and the limits of "grit" — *Personal development · beginner* · **hosts the TED/Duckworth video**
- **Hook:** "Persistence matters — but the science on 'grit' is more modest than the slogan."
- **Objective:** understand grit and, honestly, the evidence behind it.
- **Claims:** grit overlaps heavily with conscientiousness; its independent
  effect is small (per Credé, Tynan & Harms 2017).
- **Source:** Wikipedia (documents the critique with citations). **Link: live (60
  passages).** **Review note:** prefer the primary papers; the card deliberately
  carries the balancing evidence. **Freshness:** 24 mo.

### 10. Starting to program with Python — *Technology & AI · beginner* · **hosts the freeCodeCamp video**
- **Hook:** "You learn to program by writing small programs, not by reading about them."
- **Objective:** follow a complete beginner's intro to Python.
- **Source:** official Python tutorial. **Link: live (38 passages).** **Freshness:** 18 mo.

## Task 4 — multimedia relationships (every video gets a legitimate parent)

| Candidate video | Parent Original (content_id) | Why it fits |
|---|---|---|
| 3Blue1Brown — But what is a neural network? | **#4 What a neural network is** | same topic (ai-foundations), visual complement to the course |
| 3Blue1Brown — The essence of calculus | **#7 The essence of calculus** | the card is built around this intuition-first approach |
| Kurzgesagt — Black holes / information paradox | **#8 Reading the evidence on black holes** | same topic; the card frames the open problem |
| TED — Grit (Duckworth) | **#9 Perseverance, and the limits of "grit"** | the card carries the balancing evidence the talk omits |
| freeCodeCamp — Learn Python | **#10 Starting to program with Python** | same topic; video is the hands-on counterpart |

No video is attached to an unrelated card. All five have a genuine parent in this
batch.

## Task 5 — editorial review inventory

| # | Card | Source link | Evidence | High-impact | Decision |
|---|---|---|---|---|---|
| 1 | A first monthly budget | BLOCKED (robots) | incomplete | **yes** | **REVISION** — verify source manually or switch to a crawlable gov source |
| 2 | Secure your main accounts | live | claims unmatched | no | **READY FOR HUMAN APPROVAL** (confirm wording) |
| 3 | Getting to sleep | live (JS) | incomplete | **yes** | **REVISION** — verify NHS claims manually; high-impact second reviewer |
| 4 | What a neural network is | live | claims unmatched | no | **READY FOR HUMAN APPROVAL** |
| 5 | Preparing for an interview | live | claims unmatched | no | **READY FOR HUMAN APPROVAL** |
| 6 | Writing people understand | live (JS) | thin | no | **READY FOR HUMAN APPROVAL** (confirm wording) |
| 7 | The essence of calculus | live (JS) | incomplete | no | **REVISION** — JS page yields no text; verify or add a text source |
| 8 | Reading the evidence on black holes | live | **1 claim verified** | no | **READY FOR HUMAN APPROVAL** (frame paradox as open) |
| 9 | Perseverance / limits of grit | live | balanced | no | **READY FOR HUMAN APPROVAL** (carries the critique) |
| 10 | Starting to program with Python | live | claims unmatched | no | **READY FOR HUMAN APPROVAL** |

- **Ready for human approval:** 2, 4, 5, 6, 8, 9, 10 (7). **Revision required:** 1,
  3, 7 (3). **Blocked by evidence:** none outright — 1/3/7 are revisable.
- **High-impact (independent second reviewer required):** 1 (Personal Finance),
  3 (Health). **Not self-approved.**
- **Source-link verification:** 8/10 sources retrieved live; MoneyHelper
  robots-blocked; NHS/Khan are JS-rendered (live but no extractable text).

"Ready for human approval" means the agent found no blocker; **a human still
confirms the content and (for high-impact) a second reviewer approves.** No card
is auto-approved.

## Next step
Human review of the 7 ready cards; fix the 3 revision cards (source/claim
grounding); then follow `VSHARES_ORIGINALS_PUBLICATION_PROCEDURE.md` to publish a
parent card and its hosted video in development, owner-authorised.
