# VSHARES — Content Universe (20 categories) & 100-card pilot

- **Date:** 2026-11-18 · Planning only. No taxonomy row is created here; **"new"
  categories are proposals**, applied later only via the seed/admin path with
  owner approval. Existing rows are reused, not duplicated.
- Companion: `VSHARES_CONTENT_FACTORY.md` (agents, rubric, lifecycle, scaling).

## Existing taxonomy (reuse — do not recreate)

8 categories already seeded (`supabase/seed/010_taxonomy.sql`), 2 high-impact:
**Technology and AI**, **Career Development**, **Entrepreneurship**, **Personal
Finance (HI)**, **Productivity**, **Communication**, **Health and Wellbeing
(HI)**, **Learning How to Learn** — with ~48 topics (budgeting, security-basics,
data-and-privacy, sleep, interviews, spaced-repetition, tax-and-pensions-uk, …).
Dedup is enforced by the **`source_url` UNIQUE** constraint plus the Duplicate
Detection agent; no two cards may share a link.

## Task 2 — The 20-category content universe

Levels follow one rule everywhere: **beginner** = assumes nothing, one idea;
**intermediate** = assumes the basics, adds nuance/trade-offs; **advanced** =
assumes fluency, edge-cases and judgement. Formats are drawn from the existing
`content_format` enum (`article|video|podcast|course|tool|book`).

| # | Category | State | High‑impact | Example topics (no overlap) | Typical formats | Freshness cadence | Pilot cards | 2,000‑scale share |
|---|---|---|---|---|---|---|---|---|
| 1 | Personal Finance | exists | **yes** | budgeting, debt-and-credit, saving-and-investing-basics, avoiding-scams, tax-and-pensions-uk | tool, article | 6 mo (rules/limits change) | 8 | 9% |
| 2 | Health & Wellbeing | exists | **yes** | sleep, movement-and-strength, nutrition-basics, stress-and-mood | article, video | 12 mo (vs guidance) | 7 | 7% |
| 3 | Technology & AI | exists | no | ai-foundations, working-with-ai-tools, security-basics, data-and-privacy, software-and-building | course, article, video | 6 mo (fast-moving) | 7 | 8% |
| 4 | Career Development | exists | no | job-search, interviews, career-changes, management-and-leadership | article, video | 12 mo | 6 | 6% |
| 5 | Communication | exists | no | clear-writing, speaking-and-presenting, difficult-conversations, listening | article, book | 24 mo (durable) | 5 | 5% |
| 6 | Learning How to Learn | exists | no | spaced-repetition, deliberate-practice, note-taking, reading-and-comprehension | article, book | 24 mo | 6 | 6% |
| 7 | Productivity | exists | no | habits, planning-and-prioritising, attention-and-focus, meetings-and-email | article, tool | 18 mo | 5 | 5% |
| 8 | Entrepreneurship | exists | no | finding-an-idea, talking-to-customers, pricing-and-revenue, marketing-basics | article, course | 18 mo | 5 | 5% |
| 9 | Science & Nature | **new** | no | how-the-body-works, climate-and-weather-basics, space-basics, everyday-physics | video, article | 24 mo | 5 | 5% |
| 10 | History & Society | **new** | no | how-we-got-here, civic-institutions, reading-history-critically | article, podcast, book | 36 mo | 4 | 4% |
| 11 | Practical Skills & Home | **new** | partial | basic-repairs, home-safety, buying-well, tools-and-maintenance | video, article | 18 mo | 5 | 5% |
| 12 | Creativity & Craft | **new** | no | starting-to-write, drawing-basics, music-fundamentals, making-and-prototyping | video, course | 36 mo | 4 | 4% |
| 13 | Personal Development & Mindset | **new** | no | goal-setting, decision-making, confidence, values-and-purpose | article, book | 24 mo | 5 | 5% |
| 14 | Mental Health & Resilience | **new** | **yes** | understanding-anxiety, low-mood-basics, when-to-seek-help, resilience-skills | article, video | 12 mo (vs clinical guidance) | 5 | 5% |
| 15 | Law, Rights & Citizenship | **new** | **yes** | consumer-rights, contracts-basics, tenant-rights, knowing-your-rights | article | 12 mo (law changes) | 4 | 4% |
| 16 | Data & Analytical Thinking | **new** | no | reading-statistics, spotting-bad-data, probability-intuition, charts-that-mislead | article, course | 24 mo | 4 | 4% |
| 17 | Environment & Sustainability | **new** | no | home-energy, waste-and-recycling, sustainable-choices, understanding-climate-data | article, tool | 18 mo | 3 | 3% |
| 18 | Cooking & Food Skills | **new** | partial (allergy/safety) | kitchen-basics, cooking-on-a-budget, food-safety, batch-cooking | video, article | 36 mo | 4 | 4% |
| 19 | Relationships & Parenting | **new** | partial | communication-in-relationships, early-years-basics, supporting-a-teenager | article, book | 24 mo | 4 | 4% |
| 20 | Civic & Admin | **new** | **yes** | benefits-and-support, insurance-basics, public-services, dealing-with-bureaucracy | article | 12 mo | 4 | 4% |

**Totals:** 20 categories (8 exist, 12 proposed), **6 high-impact** (1,2,14,15,20
fully; 11/18/19 topic-level), pilot allocation **= 100**.

**Overlap control:** security & privacy stay **under Technology & AI** (not a
separate category); `nutrition-basics` stays under **Health** (Cooking covers
*skills*, not nutrition advice); `tax-and-pensions-uk` stays under **Personal
Finance** (Civic & Admin covers benefits/insurance/public services). The
Duplicate Detection agent + `source_url` UNIQUE prevent same-link duplicates
across any category.

### Source & freshness requirements (policy)
- **Source bar:** a reputable, identifiable publisher (official body, named
  expert, peer-reviewed or established institution). Prefer primary/official
  sources, especially for high-impact. One canonical `source_url` per card.
- **Freshness:** cadence per the table above; **high-impact = 12 months or on
  any rule change**, whichever first. A failed link check or a superseded source
  pulls the card out of `published` for re-review (Freshness Monitor).
- **High-impact risk:** finance, health, mental health, legal, safety and
  benefits carry real-world consequences. Mandatory: "educational, not advice"
  framing, a signpost to professional help where relevant, and **independent
  second-reviewer approval** (DB-enforced for high-impact).

## Task 6 — First 100-card pilot curriculum

A balanced, deliberately *small* curriculum — **a plan, not 100 pre-written
articles.** Each entry below is a slot the factory researches and drafts, then a
human reviews; nothing is published by this document. Allocation matches the
table above. **Budgeting is included** (the existing seeded Budgeting card is
one of the eight Personal Finance slots).

| Category | Cards | Example pilot slots (topic → objective) | Suggested source class | Risk | Editorial requirement |
|---|---|---|---|---|---|
| Personal Finance | 8 | budgeting→build a first monthly budget (**existing seed**); debt→order of repayment; saving→emergency fund; scams→pause-before-paying; tax-pensions→what a payslip means | MoneyHelper, HMRC, FCA, Take Five | **high** | 2nd reviewer; "educational, not advice" |
| Health & Wellbeing | 7 | sleep→consistent wake time (**existing**); movement→starting to move; nutrition→plates not diets; stress→a grounding routine | NHS, WHO, peer-reviewed | **high** | 2nd reviewer; signpost to GP |
| Technology & AI | 7 | ai-foundations→what "training" means (**existing**); ai-tools→prompting basics; security→2FA on email (**existing**); privacy→a data request (**existing**) | NCSC, ICO, vendor docs, Google | low–med | accuracy on fast-moving facts; dated |
| Career Development | 6 | interviews→STAR answers (**existing**); job-search→a focused CV; career-change→transferable skills | National Careers Service, reputable guides | low | — |
| Communication | 5 | clear-writing→cut by a third (**existing**); presenting→one message per slide; difficult-conversations→open without blame | GDS style guide, established authors | low | — |
| Learning How to Learn | 6 | spaced-repetition→review before forgetting (**existing**); practice→deliberate reps; note-taking→notes you reuse | Nielsen, peer-reviewed cognition | low | claims trace to studies |
| Productivity | 5 | habits→smallest next action; prioritising→what not to do; focus→single-tasking | established authors, research | low | avoid hype/"hacks" |
| Entrepreneurship | 5 | business-setup→sole trader vs ltd (**existing**); customers→talk before building; pricing→value not cost | GOV.UK, reputable founders | med | UK admin accuracy |
| Science & Nature | 5 | body→how sleep restores; climate→reading a temperature chart; space→scale of the solar system | universities, royal societies, NASA/ESA | low | no sensationalism |
| History & Society | 4 | how-we-got-here→one turning point well; civics→how a law is made; reading-history→sources & bias | universities, national archives | low | balance; cite primary |
| Practical Skills & Home | 5 | repairs→fix a dripping tap; safety→smoke/CO basics; buying-well→spotting durability | manufacturer/official safety, trades bodies | **safety topics high** | safety-critical → 2nd reviewer |
| Creativity & Craft | 4 | writing→start a first draft; drawing→see before you draw; music→rhythm first | established teachers, institutions | low | — |
| Personal Development & Mindset | 5 | goals→outcome vs process; decisions→a simple checklist; confidence→evidence not affirmations | research-backed authors | low | avoid pseudoscience |
| Mental Health & Resilience | 5 | anxiety→what it is; low-mood→first steps; when-to-seek-help→the threshold | NHS, Mind, WHO | **high** | 2nd reviewer; crisis signposting |
| Law, Rights & Citizenship | 4 | consumer-rights→returns & refunds; contracts→what you're agreeing to; tenant→deposit rights | GOV.UK, Citizens Advice | **high** | 2nd reviewer; jurisdiction noted |
| Data & Analytical Thinking | 4 | statistics→average vs median; bad-data→base rates; charts→misleading axes | textbooks, reputable explainers | low | examples verified |
| Environment & Sustainability | 3 | home-energy→where heat leaks; recycling→what actually recycles; climate-data→reading trends | IEA, official bodies | low | data current |
| Cooking & Food Skills | 4 | kitchen→five techniques; budget→cheap staples; food-safety→fridge & reheating | food standards agency, chefs | **safety high** | food-safety → 2nd reviewer |
| Relationships & Parenting | 4 | relationships→listening to understand; early-years→talk & read; teens→staying connected | NHS, parenting institutions | **med** | signpost support services |
| Civic & Admin | 4 | benefits→what you may be entitled to; insurance→what cover means; public-services→getting help | GOV.UK, Citizens Advice | **high** | 2nd reviewer; jurisdiction noted |

**Pilot quality gate (before beta):** every published pilot card passes a human
spot re-check; **0 broken links**; **≥7 published including Budgeting**; all
high-impact cards carry "educational, not advice", professional signposting, and
an independent second-reviewer approval (DB-enforced). **No slot is published by
this plan** — it feeds the Phase 10.2 editorial pass.

## Restrictions honoured
Documentation and planning only · no taxonomy/content rows created · no migration
· no publishing · no weakening of VAI admission or RLS · no merge/deploy.
