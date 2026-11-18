# VSHARES — Master Product Specification

- Version: 1.0 · Date: 2026-11-14 · Status: MVP scope approved by the owner (Phase 0 decisions); awaiting sign-off of this written form.
- Authority: the owner's Master Build Directive v2.0 and Phase 0 Decisions. Where they differ, the Phase 0 Decisions win.
- Evidence base: repository audit (`VSHARES_PROJECT_DISCOVERY.md`). The historical Lovable beta could not be inspected (host blocked from this environment); nothing here is drawn from it.

Part A is the long-term vision, preserved in full. Part B is the MVP — the only part being built now.

---

# Part A — The vision

## A1. What VSHARES is

An AI-powered **value acquisition and human capability platform** that turns passive attention into measurable personal development.

| | |
|---|---|
| Mission | Stop doomscrolling. Start value scrolling. |
| Promise | Not designed to keep you scrolling. Designed to move you forward. |
| Ambition | An Operating System for Becoming. |
| Philosophy | Attention consumed vs attention compounded. |
| Core experience | DISCOVER → LEARN → APPLY → GROW → SHARE |
| Success measure | Useful progress per unit of attention — never raw time on site. |

### Names

| Name | Meaning |
|---|---|
| **VSHARES** | The canonical platform brand: product, UI, domain. |
| **VSHARE** | The personal development experience inside the platform (PATH, YOU). Not a separate app. |
| **VAI** | The intelligence engine. Named wherever a recommendation is explained. |

### Loops

- Core (full): DISCOVER → LEARN → UNDERSTAND → APPLY → MEASURE → IMPROVE → SHARE
- Platform intelligence: SIGNAL → DIAGNOSE → RECOMMEND → ACT → MEASURE → LEARN
- Human development: CURIOSITY → KNOWLEDGE → SKILL → CAPABILITY → OPPORTUNITY

## A2. Product rules (apply to every release)

1. Every feature must serve at least one of: useful knowledge, practical capability, meaningful action, beneficial habits, relevant opportunities, genuine progress measurement, useful knowledge exchange, less low-value consumption.
2. No optimisation for time spent or compulsive use. Feed sessions are finite and end with a next step.
3. No manipulative retention: no guilt, false urgency, or streak-loss pressure. Breaks are not punished.
4. No fabricated intelligence. Every score and recommendation is computed from recorded events and can be explained.
5. Self-reported progress is labelled as such and never mixed silently with demonstrated progress.
6. Progressive disclosure: one path, one mission, one insight, one category, one next action.
7. Users can inspect, correct, export and delete what the platform knows about them, and switch personalisation off.

## A3. The full platform (roadmap, not MVP)

Each is specified in the owner's directive and tracked in `VSHARES_FEATURE_REGISTER.md` with a release target. The architecture reserves a module for each (see `VSHARES_ARCHITECTURE.md` §3).

| System | Essence | Module | Target |
|---|---|---|---|
| Intelligent Value Feed | Ranked, finite, explainable | `feed`, `vai` | **MVP** (deterministic) |
| VAI personal intelligence | Next best move, mentor, memory, adaptive difficulty | `vai` | MVP foundation → R2 → R3 |
| User DNA and preference memory | Inspectable, correctable learner profile | `personalisation` | MVP (preference memory) → R2 (DNA view) |
| Knowledge library | Saves → collections → spaced repetition | `progress` | MVP (saved) → R2 |
| Personal progress dashboards | Activity / Knowledge / Applied kept separate | `progress` | MVP (basic) → R2 |
| Learning paths (ZERO → COMPETENT) | Modules, lessons, checks, assignments | `learning` | R2 |
| Quizzes and skill mastery | Demonstrated, not clicked | `learning` | R2 |
| Quests and daily missions | Learning into action, no streak pressure | `learning` | R2 |
| Gamification | XP, achievements, opt-in leaderboards | `progress` | R2 |
| Applied Learning | Commit, log, reflect, follow up | `progress` | R2 |
| Daily cycle | Optional morning / midday / evening | `vai` | R2 |
| Content Flow Intelligence | IMPRESSION → VIEW → COMPLETE → SAVE → QUIZ → PASS → APPLY → SHARE | `analytics` | MVP (essential funnel) → R3 (flow map) |
| Platform Alignment Score, value-leak detection | Configurable mission indicators | `analytics` | R3 |
| Retention intelligence | Consent-based, cooldown, "no intervention" allowed | `vai` + `analytics` | R3 |
| Creator publishing and analytics | Original content, usefulness metrics | `creators` | R3 |
| Admin Command Centre | Overview, content, flow map, VAI, creators, retention, ops, governance | `admin` | MVP (moderation, taxonomy, essentials) → R3 |
| Multiformat (video, audio, audiobooks) | Hosted media | `content` | R3+ |
| Social learning | Follows, public collections, discussions | `creators` / `profiles` | R3+ |
| Opportunity discovery | Traceable real opportunities | new module | Expansion — needs approved spec |
| Creator marketplace, payments | Premium content, subscriptions, payouts | new module | Expansion — needs approved commercial and legal spec |

The "V3–V20 engine" concepts from PR #5 (digital twin, Life OS, market intelligence and others) are preserved as concept references in `VSHARES_PR_DISPOSITION.md`; none of that code is carried forward.

---

# Part B — The MVP

## B1. Objective

**Validate value-curated scrolling with roughly the first 100 users.**

The MVP must show that people want a better way to spend their attention: they arrive, find something useful quickly, complete it, come back, and say the content was worth their time.

What would count as validation (targets are proposals for owner confirmation):

| Signal | Proposed target for the first 100 users |
|---|---|
| Visitor → first completed item in first session | ≥ 30% |
| Median time to first completion | ≤ 90 seconds |
| Registered users who complete ≥ 3 items in week 1 | ≥ 40% |
| Users returning in week 2 with ≥ 1 completion | ≥ 25% |
| Items marked "not useful" / items completed | ≤ 10% |

## B2. Audience and market

Adults (18+) interested in self-improvement, practical knowledge, career growth, entrepreneurship, financial literacy, technology and skills. United Kingdom first; architecture ready for international expansion (locale and timezone stored, UTC timestamps, no UK-only assumptions in the schema). Free, no payments.

## B3. What the content is

A **value card** is the unit of the MVP feed. It represents one genuinely useful external educational resource:

| Field | Notes |
|---|---|
| Title | Ours, clear and specific |
| Why it's worth your time | One or two sentences, original |
| Key takeaways | 1–3 short points, written by the curator in their own words — enough to learn something in under a minute |
| Source | URL, publisher / creator name, and author where known — always displayed |
| Format, length, level | Article / video / podcast / course / tool; estimated minutes; beginner–advanced |
| Topic | One primary topic, optional secondary topics |
| Provenance | Curated by the team, or submitted by a named user and approved by a moderator |

Rules:
- VSHARES links to sources and attributes them. It does not copy, host or scrape third-party content. Summaries and takeaways are original and short.
- The launch catalogue contains only real resources whose links were opened and checked at curation time. No placeholder or duplicate items.
- AI-drafted summaries are flagged in the data and labelled in the UI, and are published only after human review.
- Finance, health and legal topics are marked high-impact: reviewed by a named moderator and shown with an "educational, not advice" notice.

The schema is ready for original creator content and authorised ingestion later (`kind`, `origin`, licence fields) without building either now.

## B4. Navigation

`PATH | LEARN | EXPLORE | SAVED | YOU` — the owner's navigation, kept from day one so users never have to relearn it. Each tab holds only what the MVP really does.

| Tab | MVP content | Grows into |
|---|---|---|
| **PATH** | VAI's *Next Best* recommendation with its reason; this week's progress; your topics | Learning paths, missions, mastery |
| **LEARN** | The Value Feed: a finite ranked session of value cards | Lessons, quizzes, media |
| **EXPLORE** | Categories, topics, search | Creators, collections, paths |
| **SAVED** | Saved cards; completed history | Collections, spaced repetition |
| **YOU** | Profile; preference memory (inspect and edit); progress; submissions; privacy, export, delete | User DNA, applied log, achievements |

## B5. MVP features and acceptance criteria

A feature is done when every criterion has an automated test that passes, the UI works at 360px and 1280px, loading / empty / error states exist, and docs are updated.

### M-01 First Learning Win (guest)
A new visitor learns something useful without registering.
- Home shows the promise and 6–8 topic chips; no sign-up wall, no onboarding form.
- Choosing a topic opens the top-ranked value card for it immediately.
- The card's takeaways are readable on the page; the source opens in a new tab.
- "Got it" marks the card completed and shows a win state: what was learned and one follow-up.
- A non-blocking prompt offers to keep progress by creating an account.
- *Test:* E2E completes home → topic → card → completed on a mobile viewport with no authentication, and the completion is persisted to the guest account.

### M-02 Account creation and sign-in
- Email magic link and Google sign-in through Supabase Auth.
- A guest who registers keeps all prior progress on the same account.
- Sessions are HTTP-only cookies, refreshed server-side; sign-out works everywhere.
- Post-login redirects accept only same-site relative paths.
- Account recovery = request a new magic link; email change requires confirmation of the new address.
- *Tests:* sign-in, guest upgrade keeps completions, redirect rejects external targets, protected routes redirect unauthenticated users. No demo-mode bypass exists.

### M-03 Topic selection and preference memory
- Users choose and change topics at any time; guests' choice is remembered on their guest account.
- The platform learns topic affinity from completes, saves, likes and skips.
- YOU shows what is remembered (declared topics, learned affinities, hidden items) and lets the user edit or reset it.
- A personalisation switch reduces ranking to chosen topic + quality + freshness.
- *Tests:* preferences persist across sessions; learned affinity changes after interactions; reset clears it; switch changes ranking inputs.

### M-04 Personalised ranked feed (VAI foundation)
- Deterministic, documented ranking (`VSHARES_ARCHITECTURE.md` §6).
- Sessions are finite (default 7 cards) and end with a closing card, not more feed.
- Completed, skipped and recently shown cards are not repeated.
- Every card can show "Why this?" with the top reasons.
- Every recommendation shown is logged with its score breakdown.
- *Tests:* unit tests for each ranking component and the total order; integration test that completed/skipped items are excluded; E2E for the session end state.

### M-05 Content interactions
- Open, complete ("Got it"), save, like, skip, and "not useful" feedback.
- All are idempotent, reversible where sensible (save, like, skip), and recorded server-side.
- *Tests:* each interaction persists, is isolated per user (RLS test), and emits the defined analytics event.

### M-06 Saved knowledge library
- SAVED lists saved cards (newest first, filter by topic) and completed history.
- *Tests:* save appears, unsave removes, another user cannot read it.

### M-07 Basic progress tracking
- Counts meaningful completions, not page views: items completed, estimated minutes of learning, topics covered, active days — this week and all time.
- Each number has a "how this is counted" note. No streak pressure, no ranking of people.
- *Tests:* progress derives only from completion records; opening a card does not change it.

### M-08 Resource submission and sharing
- Registered users submit a link with title, why it is useful, topic. Guests cannot submit.
- Submissions are `pending` until a moderator approves; the submitter sees status and any rejection reason.
- Every published card has a public, shareable page with attribution; sharing uses the native share sheet or copy-link.
- Rate limits and URL validation (https only, no private-network targets) apply.
- *Tests:* validation, pending items invisible to others, approval publishes, rate limit enforced, public page renders without a session.

### M-09 User profiles
- Handle (generated, editable, unique), display name, optional avatar; private by default.
- *Tests:* validation, uniqueness, partial update does not erase other fields, private profiles are not readable by others.

### M-10 Data export and account deletion
- Export: one click produces a JSON file of everything held about the user.
- Delete: confirmation step, then the account and all personal data are removed; contributed public cards remain with the author reference removed.
- *Tests:* export contains every user-owned table; after deletion no row references the user.

### M-11 Admin moderation and catalogue management
- Roles: learner, moderator, admin — granted only by an admin, checked server-side and in the database.
- Moderation queue: approve, edit, reject with reason; handle user reports; unpublish.
- Catalogue: create and edit value cards; manage categories and topics (add, edit, archive, reorder).
- Every admin action is written to an audit log.
- *Tests:* non-admins get 403/redirect on every admin route and action; RLS blocks direct writes; audit entries are created.

### M-12 Essential analytics
- First-party events for the funnel: visit → topic selected → card shown → opened → completed → saved / liked / skipped → shared, plus sign-up.
- Admin view: first-session funnel, per-topic and per-card funnel, the B1 validation metrics.
- Privacy rules in `VSHARES_SECURITY.md` §6.
- *Tests:* event vocabulary enforced; rollup totals match raw events on a fixture.

### M-13 Premium responsive application
- Black/gold design system per `VSHARES_DESIGN_SYSTEM.md`; mobile-first; WCAG 2.2 AA on core journeys.
- *Tests:* axe checks on every core screen in E2E; keyboard-only run of M-01.

### M-14 Security and operational foundations
- Per `VSHARES_SECURITY.md` and `VSHARES_RELEASE_PLAN.md`: validated config, input validation, rate limiting, security headers, RLS on every table, secret scanning, dependency audit, health checks, structured logs, migrations.

## B6. Explicitly not in the MVP

Learning paths, quizzes, mastery, quests, XP, achievements, leaderboards, applied-learning log, spaced repetition, collections, LLM features, creator tools and analytics, hosted media, notifications and retention interventions, flow map, alignment score, value-leak detection, social graph, opportunities, marketplace, payments.

They remain in Part A and the feature register. Nothing in the MVP may be built in a way that blocks them.

## B7. Open items

Listed in `VSHARES_PROGRESS.md` → "Decisions required".
