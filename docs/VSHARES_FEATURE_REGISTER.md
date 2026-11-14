# VSHARES — Feature Register

Date: 2026-11-14. Targets revised after the owner's Phase 0 decisions; statuses updated after Milestone 1. Updated whenever a feature changes status.

## How to read this

**Evidence** — what supports the claim that a feature existed or was intended:

| Code | Meaning |
|---|---|
| `CODE` | Working code exists on `main` of this repository (legacy quality; see discovery doc). |
| `BRANCH` | Code exists only on an unmerged branch. PR #1 = real backend design. PR #5 = browser-local mock heuristics. |
| `OWNER-H` | The owner's directive describes it as part of the historical beta or earlier design work. **Not independently verified** — the beta site and its code are not available in this workspace. |
| `OWNER-P` | The owner's directive lists it as proposed or potential. |
| `NEW` | Recommended by engineering in this rebuild. |

**Status** in the rebuild: `not started` · `specified` · `implemented` · `tested` · `released`. Legacy code does not count: everything is `not started` until rebuilt.

**Target**: `MVP` first release (validate value-curated scrolling with ~100 users) · `R2` learning engine, applied learning, VAI mentor · `R3` creators, platform intelligence, retention · `X` expansion, needs its own approved spec.

**Priority**: P0 required for the MVP · P1 important · P2 valuable later · P3 speculative.

## Register

### Shell, identity, access

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-001 | Black/gold responsive design system | Premium identity, consistent UI | OWNER-H; BRANCH PR #1 (theme) | P0 | — | **implemented** (tokens, primitives, gallery) | **tested** (axe on 7 routes, both viewports) | MVP |
| F-002 | Five-tab navigation PATH / LEARN / EXPLORE / SAVED / YOU | Core information architecture | OWNER-H; BRANCH PR #5 (feed/explore/saved/profile bottom nav) | P0 | F-001 | **implemented** (five tabs, every route live) | **tested** (routes, active state, keyboard, tap size) | MVP |
| F-003 | First Learning Win: guest learning without registration | First-session activation | OWNER-H (problem); CODE has a cookie bypass, not a real guest mode | P0 | F-024, F-031 | **implemented** (home → topic → card → "Got it" → win summary, no account needed) | **tested** (unit + database; the live 60-second journey awaits an auth service) | MVP |
| F-004 | Account creation: magic link | Low-friction secure sign-in | CODE | P0 | — | **implemented** | unit + schema tested; live journey awaiting an auth service | MVP |
| F-005 | Account creation: Google | Faster sign-up | NEW (CODE has GitHub OAuth behind a flag) | P0 | F-004 | not started | none | MVP |
| F-006 | Guest → account upgrade keeping progress | Do not lose the first win | NEW | P0 | F-003, F-004 | **implemented**, including collision handling | merge rules **tested** (16 database assertions) | MVP |
| F-007 | Profile (handle, display name, visibility) | Identity | CODE | P0 | F-004 | **implemented** (avatar deferred to M6) | **tested** (database + schemas) | MVP |
| F-008 | Interests and goals | Personalisation inputs | CODE (topics, goals, daily minutes) | P0 | F-020 | partial: topic selection and level **implemented**; written goals are R2 | **tested** (database: declared topics, affinity) | MVP |
| F-009 | Role-based access (learner, moderator, admin) | Server-side authorisation | OWNER-H (admin); no code | P0 | F-004 | **implemented** | **tested** (14 database assertions) | MVP |
| F-010 | Data export and account deletion | User control, UK GDPR | OWNER-P | P0 | F-007 | **implemented** (`/you/data`: JSON export, account deletion with reauthentication) | **tested** (33 database assertions; export contents, erasure, no orphans) | MVP |
| F-011 | Personalisation off switch | User control | OWNER-P | P0 | F-031 | **implemented** (preferences: personalisation switch, session length) | **tested** (database + ranker with personalisation off) | MVP |
| F-012 | Notification preferences | User control | OWNER-P | P1 | — | not started | none | R3 |
| F-013 | Guest account retention and purge | Do not hold abandoned data for ever | NEW (UK GDPR storage limitation) | P0 | F-003 | **implemented** (documented policy, dry run by default, audited; **not scheduled** — automatic deletion awaits owner approval) | **tested** (24 database assertions: eligibility, activity protection, idempotence, privilege) | MVP |

### Taxonomy and content

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-020 | Database-driven categories, subcategories, topics, tags | Flexible taxonomy | BRANCH PR #1 (`topics` table); CODE uses a hardcoded list | P0 | — | **implemented** in the database (8 categories, 40 topics, seeded from the approved taxonomy) | **tested** (12 database assertions + 6 unit tests) | MVP |
| F-021 | Admin taxonomy management (add, edit, archive, reorder) | Curate the catalogue | OWNER-P | P0 | F-020, F-009 | **not started — RELEASE BLOCKER.** Cards and taxonomy are managed by audited server functions called by hand, not by a screen | the functions are **tested** (database); no interface exists, and none is claimed | MVP, before public release |
| F-022 | Category merge | Taxonomy hygiene | OWNER-P | P2 | F-021 | not started | none | R3 |
| F-023 | Content items with versions and publish workflow | Reviewed, auditable content | OWNER-P; CODE has unversioned link posts | P1 | F-020 | **implemented** (content items, immutable versions, draft → review → published) | **tested** (22 database assertions) | R3 |
| F-024 | Value cards: curated external resources with original summary, takeaways and attribution | The unit of the MVP feed | OWNER-H; BRANCH PR #5 (local catalogue) | P0 | F-023 | **implemented**; the first 10 cards are seeded as drafts and cannot publish until their links are checked | **tested** (lifecycle, visibility, attribution) | MVP |
| F-025 | Difficulty, prerequisites, objectives, estimated time, relationships | Sequencing and ranking inputs | OWNER-P; CODE (difficulty, minutes) | P1 | F-023 | **implemented** (level, minutes, format); prerequisites and objectives remain R2 | **tested** (database constraints + ranker level and time fit) | MVP (level, time, format); R2 (prerequisites, objectives) |
| F-026 | AI-generated label and high-impact safeguards | Trust and safety | OWNER-P | P0 | F-023 | **implemented** (AI-assisted label; high-impact derived from the category, second reviewer required) | **tested** (6 database assertions) | MVP |
| F-027 | Video content | Multiformat | OWNER-P | P2 | F-023, object storage | not started | none | R3 |
| F-028 | Audio and audiobooks | Multiformat | OWNER-H (planned) | P3 | F-027 | not started | none | X |
| F-029 | User-submitted resource links (moderated) | Knowledge exchange | CODE (`POST /api/posts`, unmoderated) | P0 | F-102 | **implemented** (`/you/submit`, moderated; no submission can bypass review or link checking) | **tested** (15 database assertions + rate limit and URL unit tests) | MVP |

### Value Feed (LEARN)

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-030 | Value Feed of value cards | Immediate useful discovery | CODE (unranked list) | P0 | F-024 | **implemented** (ranked finite sessions on LEARN) | **tested** (unit + database) | MVP |
| F-031 | Deterministic ranking with explanations | Relevance without opacity | BRANCH PR #1 (SQL ranker), PR #5 (signal list); CODE shows a fake match score | P0 | F-030, F-034 | **implemented** (deterministic weighted ranker v1, weights in a versioned row, "Why this?" from the logged breakdown) | **tested** (43 ranker unit tests + 54 database assertions) | MVP |
| F-032 | Repetition avoidance / seen-content memory | No pointless repeats | BRANCH PR #1 (`content_memory`) | P0 | F-034 | **implemented** (impression penalty and same-source penalty) | **tested** (unit + database) | MVP |
| F-033 | Finite sessions ending in a next step | Attention compounded, not consumed | NEW | P0 | F-031 | **implemented** (seven cards, summary, starting another is deliberate) | **tested** (19 session unit tests + 38 database assertions) | MVP |
| F-034 | Interaction tracking (open, complete, save, like, skip, feedback) | Signals for ranking and analytics | BRANCH PR #1 (`content_events`) | P0 | — | **implemented** (open, complete, save, like, skip, not-useful; counters written only by database functions) | **tested** (21 database assertions) | MVP |
| F-035 | Save | Build the library | CODE (table only, no UI) | P0 | F-034 | **implemented** (SAVED library with topic filter and sort) | **tested** (database isolation + end-to-end) | MVP |
| F-036 | Share via public lesson link | Knowledge exchange, acquisition | OWNER-H | P0 | F-024 | **implemented** (share sheet with clipboard fallback; unpublished cards are not shareable) | **tested** (database visibility + end-to-end 404 on an unpublished slug) | MVP |
| F-037 | "Not useful" / relevance feedback | Explicit signal | BRANCH PR #5 | P0 | F-034 | **implemented** ("not useful" recorded as an explicit negative signal) | **tested** (database) | MVP |
| F-038 | Follow-up lesson suggestion | Continuity | OWNER-H | P0 | F-031 | **implemented** (session summary offers the next step; PATH offers the next best move) | **tested** (Next Best unit tests) | MVP |
| F-039 | Content quality score | Rank useful content higher | OWNER-H; BRANCH PR #5 (heuristic) | P0 | F-034 | **implemented** (editorial quality plus a smoothed completion rate; no click-rate signal) | **tested** (ranker unit tests incl. the prior with no data) | MVP (editorial + completion rate); R3 (outcome-derived) |

### Learning engine (PATH)

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-040 | Learning paths with modules and lessons | ZERO → COMPETENT | OWNER-H; BRANCH PR #5 (local) | P1 | F-024 | not started | none | R2 |
| F-041 | Enrolment and lesson/path progress | Track the journey | OWNER-H | P1 | F-040 | not started | none | R2 |
| F-042 | Quizzes: multiple choice, true/false | Demonstrated understanding | OWNER-H | P1 | F-024 | not started | none | R2 |
| F-043 | Server-side grading, attempts history | Integrity of mastery | NEW | P1 | F-042 | not started | none | R2 |
| F-044 | Skills and mastery records | Knowledge ≠ activity | OWNER-H; BRANCH PR #5 (heuristic) | P1 | F-043 | not started | none | R2 |
| F-045 | Practical assignments in a path | Apply inside the path | OWNER-P | P1 | F-070 | not started | none | R2 |
| F-046 | Adaptive difficulty (easier / harder next lesson) | Fit to the learner | OWNER-P | P1 | F-044 | not started | none | R2 |
| F-047 | Milestones | Visible progress | OWNER-H | P1 | F-041 | not started | none | R2 |
| F-048 | Certificates | Recognition | OWNER-P (optional) | P3 | F-044 | not started | none | X |
| F-049 | Daily quest | Convert learning to action | OWNER-H (quests); BRANCH PR #5 (daily mission, local) | P1 | F-041 | not started | none | R2 |
| F-050 | Quest library (types, difficulty, rewards, evidence) | Richer missions | OWNER-H | P1 | F-049 | not started | none | R2 |
| F-051 | Activity XP ledger | Reward participation | OWNER-H | P1 | F-034 | not started | none | R2 |
| F-052 | Achievements / badges | Recognition | OWNER-H | P1 | F-051 | not started | none | R2 |
| F-053 | Levels | Progress framing | OWNER-H | P2 | F-051 | not started | none | R2 |
| F-054 | Opt-in leaderboards | Social motivation | OWNER-H | P3 | F-051, privacy review | not started | none | X |
| F-055 | Consistency tracking without streak pressure | Habit support | OWNER-H (streaks) reshaped per directive §9 | P1 | F-034 | not started | none | R2 |

### VAI, User DNA, Applied, review

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-060 | VAI foundation: Next Best recommendation | One explainable recommendation | OWNER-H; BRANCH PR #5 (`nextAction`, local heuristics) | P0 | F-031 | **implemented** (ordered rules, one recommendation, always explained) | **tested** (Next Best unit tests) | MVP (next best content); R2 (next best move) |
| F-061 | Learning-state evaluation (gaps, level) | Input to recommendations | OWNER-P | P1 | F-044 | not started | none | R2 |
| F-062 | VAI memory (stored facts, inspectable) | Continuity with control | OWNER-P | P1 | F-061 | **implemented** for the MVP part (declared topics, learned affinity, inspectable); explicit memory records are R2 | **tested** (database) | MVP (preference memory); R2 (explicit memory records) |
| F-063 | Provider-abstracted LLM layer with safety checks and cost monitoring | Foundation for mentor features | OWNER-H (OpenAI/Gemini considered) | P1 | approved provider and budget | not started | none | R2 |
| F-064 | Mentor explanations grounded in stored content | Contextual help | OWNER-P | P1 | F-063 | not started | none | R2 |
| F-065 | Recommendation log and evaluation | Measure VAI quality | OWNER-P | P0 | F-060 | **implemented** (every served card logged with its component breakdown) | **tested** (database + explanation unit tests) | MVP |
| F-066 | User DNA view (inspect and correct) | Transparent personalisation | OWNER-H | P1 | F-008, F-044 | not started | none | R2 |
| F-070 | Applied actions: commit, log, reflect | Real-world value | OWNER-H; BRANCH PR #5 (outcome logger, local) | P1 | F-024 | not started | none | R2 |
| F-071 | Verified evidence for applied work | Objective progress | OWNER-P | P3 | F-070, moderation | not started | none | X |
| F-072 | Progress dashboard: Activity / Knowledge / Applied | Honest progress | OWNER-H (value score) | P0 | F-051, F-044, F-070 | **implemented** for activity, with every number carrying its definition and no composite score | **tested** (unit + database) | MVP (activity only); R2 (knowledge, applied) |
| F-073 | Value score with visible components | Progress summary | OWNER-H | P2 | F-072 | not started | none | R2 |
| F-080 | Spaced repetition and review-due list | Retention of knowledge | OWNER-H | P1 | F-042, F-035 | not started | none | R2 |
| F-081 | Collections | Organise the library | OWNER-P | P1 | F-035 | not started | none | R2 |
| F-082 | Library search and history | Find things again | OWNER-P | P0 | F-035 | partial: the library filters and sorts; free-text search and history are not built | **tested** (what exists) | MVP |
| F-083 | Daily cycle: morning / midday / evening | Optional routine | OWNER-H | P2 | F-060, F-070 | not started | none | R2 |

### Platform intelligence and administration

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-090 | First-party event collection | Measure the product | BRANCH PR #1 (`content_events`); OWNER-H (PostHog/Mixpanel considered) | P0 | consent design | **implemented** (derived rollups from the product tables, plus identifier-free reported counts; identified events only on granted consent; no third-party analytics) | **tested** (63 database assertions + 4 end-to-end checks that no third-party request or tracking identifier exists) | MVP |
| F-091 | First-session funnel report | Fix activation | OWNER-H (problem) | P0 | F-090 | **implemented** (`/admin/metrics`: first-win rate, median and ninetieth-percentile time to first win, completions, session and saved rates) | **tested** (20 unit tests on the dictionary and the rate rules; the rendered dashboard is a skipped live check) | MVP |
| F-092 | Content flow funnel IMPRESSION → … → SHARE | Content intelligence | OWNER-H | P0 | F-090 | partial: opened → completed → saved is measured per day and per topic; share is not yet counted | **tested** (rollup and reconciliation assertions) | MVP (to COMPLETE/SAVE/SHARE); R2 (QUIZ, PASS, APPLY) |
| F-093 | Flow map (`/admin/flow-map`) | Journeys and drop-offs | OWNER-H | P1 | F-092 | not started | none | R3 |
| F-094 | Platform Alignment Score (configurable) | Mission indicator | OWNER-H | P1 | F-092 | not started | none | R3 |
| F-095 | Value-leak detection with recommendations | Find wasted attention | OWNER-P | P1 | F-092 | not started | none | R3 |
| F-096 | Admin: catalogue and taxonomy management | Operate the catalogue | OWNER-P | P0 | F-009 | **not started — RELEASE BLOCKER.** The moderation queue and the measurement dashboard are the only admin screens | n/a — nothing to test | MVP, before public release |
| F-097 | Admin: overview metrics | Operate the platform | OWNER-H | P0 | F-090 | **implemented** (the measurement dashboard, with every figure carrying its definition and its limit) | **tested** (unit + live checks written and skipped) | MVP (validation metrics) |
| F-098 | Admin audit log | Accountability | OWNER-P | P0 | F-009 | **implemented** (audit log written by server functions, append-only, anonymising on erasure) | **tested** (16 database assertions) | MVP |
| F-099 | Feature flags | Controlled rollout | OWNER-P | P0 | F-009 | **implemented** (server-side flags in the platform layer) | **tested** (unit) | MVP |
| F-100 | Admin: VAI intelligence (quality, errors, cost) | Operate VAI | OWNER-H | P1 | F-063, F-065 | not started | none | R3 |
| F-101 | Admin: security and operations view | Operate safely | OWNER-H | P1 | logging | not started | none | R3 |
| F-102 | Moderation queue and user reports | Governance | OWNER-P | P0 | F-009 | **implemented** (`/admin/queue`, reports, moderation actions, duplicate-report guard) | **tested** (16 database assertions + admin access denial at every layer) | MVP |
| F-103 | Source attribution and provenance tracking | Respect creators; traceability | OWNER-P (Phase 0 decisions) | P0 | F-024 | **implemented** (source, author, publisher, licence note, link-check record; outbound links carry no referrer) | **tested** (database + end-to-end) | MVP |

### Retention

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-110 | Retention signals (inactivity, save-vs-apply imbalance, repeated quiz failure, skipping, difficulty mismatch) | Diagnose | OWNER-H (`retention-triggers`) | P1 | F-090 | not started | none | R3 |
| F-111 | Interventions with cooldown and "no intervention" outcome | Redirect helpfully | OWNER-H (18 h cooldown candidate) | P1 | F-110, F-012 | not started | none | R3 |
| F-112 | Intervention effectiveness tracking | Measure and improve | OWNER-H (`retention-trigger-track`) | P1 | F-111 | not started | none | R3 |
| F-113 | Email / push delivery | Reach the user | OWNER-P | P2 | provider approval, consent | not started | none | R3 |

### Creators, social, commerce, opportunities

| ID | Feature | Purpose | Evidence | Pri | Depends on | Status | Tests | Target |
|---|---|---|---|---|---|---|---|---|
| F-120 | Creator profiles and publishing tools | Supply of useful content | OWNER-P; BRANCH PR #5 (local) | P2 | F-023, F-102 | not started | none | R3 |
| F-121 | Creator analytics (usefulness, outcomes) | Reward teaching, not clickbait | OWNER-H | P2 | F-092, F-120 | not started | none | R3 |
| F-122 | Follow creators, public collections, achievement sharing | Social learning | OWNER-P | P2 | F-120 | not started | none | R3 |
| F-123 | Discussions, peer learning, group quests | Community | OWNER-P | P3 | F-102 | not started | none | X |
| F-130 | Marketplace: paid content, subscriptions, payouts | Commercial model | OWNER-P (Stripe considered) | P3 | approved commercial and legal spec | not started | none | X |
| F-131 | Opportunity intelligence | Learning → opportunity | OWNER-P | P3 | real listing sources | not started | none | X |

## Outstanding before public release

These are not done, are not claimed as done, and must be completed and tested
before VSHARES is open to the public. Listed here so they cannot be lost in a
table of a hundred rows.

| # | What | Why it blocks | Tracked as |
|---|---|---|---|
| 1 | **Admin catalogue and taxonomy interface.** Cards, categories and topics can only be managed by calling audited database functions by hand | Operating the catalogue should not require a database session. A moderator cannot add a topic today | F-021, F-096 |
| 2 | **62 live-service checks**, covering every milestone's real journeys | Nothing that needs a sign-in has ever been exercised. Full account erasure is proven at the database layer only | `VSHARES_LIVE_VERIFICATION.md` |
| 3 | **Source link checking and editorial review of the first ten cards** | The database refuses to publish a card whose link is unchecked, so the catalogue is empty | D15, D16 |
| 4 | **The 60-second first-win benchmark, measured on a real journey** | It is the product's own acceptance criterion and has never been measured | Live check 5.6 |
| 5 | **Google sign-in** | Needs an OAuth client in the owner's Google account | F-005 |
| 6 | **Library free-text search and history** | Specified for the MVP; only filtering and sorting exist | F-082 |
| 7 | **A privileged scheduler for the rollup**, and a decision on the guest purge | Without it the dashboard has no figures. The destructive purge stays unscheduled either way | `VSHARES_SCHEDULED_JOBS.md` |

## Historical vs proposed vs new — summary

| Class | What falls in it |
|---|---|
| **Confirmed by code in this repo** | Magic-link sign-in; GitHub OAuth (flagged); profile; topic/goal/daily-minutes preferences; link-post submission; unranked feed list; a saves table with no UI. All legacy quality — see discovery doc. |
| **Exists only as branch prototypes** | Normalised topics, content memory, events, SQL ranker, validation, health check (PR #1). Saved page, bottom nav, daily mission, outcome logging, growth scores, creator and market "engines" — all browser-local mock heuristics (PR #5). |
| **Owner-reported history, unverified here** | Lovable beta; black/gold identity; PATH/LEARN/EXPLORE/SAVED/YOU; quests; XP, badges, leaderboards; User DNA; APPLIED; value and attention scoring; retention triggers and tracking; content flow funnel; Platform Alignment Score; `/admin/flow-map`; creator analytics; audiobook plans; daily cycle; beta analytics figures. |
| **Owner-proposed expansions** | Category admin incl. merge; content versions; adaptive difficulty; certificates; LLM mentor; opportunity intelligence; marketplace and payments; verified evidence; community features; value-leak detection. |
| **New in this rebuild (engineering)** | Guest accounts that upgrade in place; finite feed sessions; server-side grading; three separate progress ledgers enforced in the data model; recommendation log; pressure-free consistency tracking; AI-content and high-impact safeguards as schema fields; RLS isolation tests; CI with audit and secret scanning. |
