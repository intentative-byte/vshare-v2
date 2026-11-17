# VSHARES — Adaptive Personal Learning Intelligence: gap analysis and development plan

- Date: 2026-11-17 · **Read-only audit + plan. No code, migration or test was changed.**
- Extends `VSHARES_ARCHITECTURE_RECOVERY_AUDIT.md` into the learner model and the feedback loop.
- Principle under test: *VSHARES is a learning application that continuously learns how each
  individual learns.*
- Deliverable, as directed: the gap analysis **first**, then the exact development plan. Nothing
  is built here; nothing working is proposed for rebuild.

---

## 0. The one-paragraph finding

The pieces that make adaptation *safe* already exist and are tested — the 7-piece session, a
gradual affinity moving-average, explicit-beats-inferred for level, engagement-kept-separate-
from-learning, and admission kept independent of personalisation. What is missing is the
machinery that makes adaptation *rich*: a **confidence** signal so the system knows how much to
trust what it has learned, a **structured session-end review**, **goals and format preferences**
in the profile, a **quality-rating scale** beyond the binary useful/not-useful, **automatic
difficulty step-up** (the parameter exists but nothing reads it), and **understanding/retention
checks** (R2). The good news: every gap is an *additive* change to the existing schema and
ranker. No rebuild is warranted.

---

## 1. Requirement-by-requirement gap table

Status: **working** · **partial** · **missing** · **reserved** (hook exists, no behaviour).

| # | Requirement | Status | Evidence (paths) | Gap |
|---|---|---|---|---|
| 1 | Learning profile: interests, goals, topic familiarity, demonstrated understanding, preferred formats, history | **partial** | `user_topics` (declared, affinity, level, level_overridden); `preferences` (personalisation, session_minutes); `content_interactions` (history) | **No goals, no preferred formats, no demonstrated-understanding, no confidence** on familiarity |
| 2 | Every interaction contributes evidence: like/dislike/save/skip/complete/rate/topic-select/feedback | **partial** | `set_interaction()`, `app.apply_affinity()`; `content_interactions.feedback` (useful/not_useful) | **No quality rating scale (1–5); no dislike as distinct from skip; no format signal** |
| 3 | 7-piece session central; end-of-session usefulness review + quality rating + optional learning-preference feedback | **partial** | `feed_sessions` (size 7); `end_feed_session()` returns a summary | **No review capture** — the summary is read-only; nothing asks for usefulness/rating/prefs |
| 4 | Distinguish engagement from genuine learning; popularity/watch-time/likes never decide quality or progress | **working** | ranker uses completion rate not clicks (D-047); opening ≠ completing (D-048); likes feed affinity, not quality | — (keep) |
| 5 | Use session feedback to update recommendations, difficulty, explanation style, format, paths | **partial** | affinity → recommendations (works) | **Difficulty step-up not wired; format not a signal; explanation style fixed; paths not built (R2)** |
| 6 | Learn gradually with confidence; explicit preferences beat weak behavioural inferences | **partial** | moving average rates 0.10–0.20 (gradual); declaredInterest 0.30 > learnedAffinity 0.20; `level_overridden` | **No confidence/sample count** — a 0.5 from one skip looks like a 0.5 from twenty actions |
| 7 | Optional understanding checks + delayed retention checks | **missing** | — (quizzes/spaced-repetition are R2) | Build in R2; design below |
| 8 | Guest-first; consent; minimal data; inspect/correct; delete/export; no invasive tracking | **partial** | guest accounts, consent, `export_my_data`/`delete_my_account`, `reset_learned_preferences(scope)` | **No unified "what VAI learned" inspect/correct view** (User DNA, R2) |
| 9 | Content-quality admission independent from personalisation; only approved content in the pool | **working** | Layer B (`moderate_content`, link gate, quality_score) is separate from Layer C (ranker); feed reads `status='published'` only | — (keep) |
| 10 | Audit DB/ranker/events/session/progress before changes; reuse architecture | **done (this doc)** | — | — |
| 11 | Explainable recs + tests for cold-start, negative feedback, preference change, exploration diversity, 7-piece adaptation | **partial** | explanations from logged components; tests: cold-start prior (`ranker.test.ts:186`), skip/negative (`160`,`170`), discovery/exploration (`session.test.ts:182`), level (`ranker.test.ts:166`) | **No tests for preference-change or confidence or session-end adaptation** (features don't exist yet) |
| 12 | Don't weaken security/privacy/editorial/tests; production stays off | **constraint** | 395 DB assertions, RLS 23/23, consent-first | Honour in every step below |

**Score: 3 working, 6 partial, 2 missing, 1 is this audit.** The foundations are sound; the
adaptive layer is thin.

---

## 2. The learning profile — what exists vs what's needed

### Exists (reuse, do not rebuild)
- `user_topics(user_id, topic_id, declared, affinity 0–1, level, level_overridden)` —
  per-topic interest and difficulty. `declared` separates chosen from inferred (req 6 already
  partly honoured).
- `content_interactions(...)` — the full history: impressions, opened, completed, saved, liked,
  skipped, feedback, completed_minutes. One row per person per card.
- `preferences(personalisation_enabled, analytics_consent, session_minutes)`.
- `learner_milestones(first_completion_seconds, converted_at)`.

### Missing fields (all additive)
| Need | Where it belongs | Why |
|---|---|---|
| **Confidence** on affinity | `user_topics.observations int` (count of evidence events) | So the ranker can trust a well-evidenced affinity more than a one-action guess (req 6) |
| **Goals** | `preferences.goals jsonb` or a small `user_goals` table | req 1; drives next-best and path selection later |
| **Preferred formats** | learned: a `user_format_affinity(user_id, format, affinity, observations)` table; explicit: `preferences.preferred_formats` | req 1, 5 — so VAI can favour the formats a person actually finishes |
| **Quality rating** | `content_interactions.rating smallint (1–5)` | req 2, 3 — richer than useful/not_useful; feeds quality *evidence* (not editorial quality) |
| **Dislike** distinct from skip | `content_interactions.disliked_at` (or reuse feedback='not_useful') | req 2 — an explicit negative is stronger evidence than a skip |
| **Demonstrated understanding** | R2: `quiz_attempts`, `skill_mastery` tables | req 1, 7 |
| **Session review** | `session_reviews(session_id, usefulness smallint, rating smallint, note text, pref_json)` | req 3 |

**Nothing above replaces a working table.** Each is a new column or a new table, behind the
same RLS pattern (owner-only), the same server-write-only rule, and the same consent gate.

---

## 3. The adaptive feedback loop — current vs target

### Current loop (works, is gentle, lacks confidence)
```
action (complete/save/like/skip/feedback)
   → app.apply_affinity(target, rate)        rates: complete .15, save/like .10, skip .10, feedback .20
   → user_topics.affinity = old + (target−old)×rate     (clamped, 3dp)
   → ranker reads affinity (weight 0.20), declaredInterest (0.30) dominates
```
This satisfies "learn gradually" and "explicit beats inferred" — but it **cannot tell a confident
0.5 from an uncertain one**, and nothing happens at the end of a session beyond a summary.

### Target loop (additive)
```
action → apply_affinity (unchanged) AND increment user_topics.observations
7th card → SESSION-END REVIEW: "was this useful?" + 1–5 rating + optional "more/less of X format,
           harder/easier?"
   → record_session_review(): writes evidence, nudges format affinity, and — if the person
     opted in — adjusts stored level (respecting level_overridden)
ranker:
   • learnedAffinity scaled by confidence = observations / (observations + K):
        low evidence → lean on declaredInterest; high evidence → trust the learned signal
   • NEW small format-fit component from user_format_affinity (weight ≤ 0.05, taken from
     freshness/timeFit so the total stays 1.0 and quality/interest stay dominant)
   • difficulty step-up: after levelStepUpCompletions (=5, already a param) completions at a
     level in a topic, advance the stored level unless level_overridden
```
Everything in the target loop is **new columns + one new function + a confidence multiplier in
the existing ranker**. The session model, the admission layer and the explanation mechanism are
untouched.

---

## 4. Exact development plan (phased, additive, reuses everything)

Each phase ships with tests in the existing style, updates the docs, and changes nothing that
passes today. No production deploy. No auto-publish of drafts.

### Phase L1 — Confidence + richer evidence (highest value, smallest change)
*Makes the system know how much to trust itself — req 6, 2.*
1. Migration (additive): `user_topics.observations int not null default 0`;
   `content_interactions.rating smallint check (rating between 1 and 5)`.
2. `set_interaction()` / `apply_affinity()`: increment `observations` on each evidence event.
3. Ranker: `learnedAffinityComponent` multiplied by `confidence = observations/(observations+K)`
   (K a new ranking param, e.g. 8); with zero observations the component collapses toward the
   cold-start prior, so declared interest leads — exactly req 6.
4. Tests: a one-action affinity ranks below a many-action affinity of the same value;
   explicit declared topic still outranks a low-confidence inferred one.

### Phase L2 — Session-end review (keeps the 7-piece session central — req 3)
1. Migration: `session_reviews(session_id pk, user_id, usefulness smallint, rating smallint,
   note text, prefs jsonb, created_at)` with owner-only RLS.
2. Function `record_session_review(session_id, usefulness, rating, prefs)` — server-write-only;
   writes the review, applies a small, confidence-aware nudge to format affinity and (opt-in)
   level. Never blocks ending a session; the review is optional.
3. UI: after card 7, the existing summary gains a short, skippable review (1 tap for useful,
   1–5 stars, optional "more X / harder"). No guilt copy, no streak.
4. Tests: a review with a low rating lowers that card's/topic's signal; skipping the review
   changes nothing; a review cannot be recorded for someone else's session.

### Phase L3 — Format preference + adaptive difficulty (req 5)
1. Migration: `user_format_affinity(user_id, format, affinity, observations)`.
2. Learn format affinity from completions/ratings by format; expose a small ranker component.
3. Wire the **already-reserved** `levelStepUpCompletions`: advance stored level after N
   completions at that level in a topic, unless `level_overridden` (explicit wins — req 6).
4. Tests: a person who only finishes videos sees video-fit rise but quality/interest still
   dominate; difficulty steps up after N completions; a manual level is never overridden.

### Phase L4 — Goals + User DNA inspect/correct (req 1, 8)
1. Migration: `preferences.goals jsonb` (or `user_goals`); surface goals in onboarding and PATH.
2. A **User DNA view**: a read-only screen on YOU showing declared topics, learned affinities
   *with their confidence*, format preferences, and level per topic — each editable, each with
   a one-tap "forget this" wired to the existing `reset_learned_preferences`.
3. Tests: everything shown is the person's own (RLS); editing a declared preference overrides
   the inferred one; export includes the new fields; deletion removes them.

### Phase L5 (R2) — Understanding + retention checks (req 7)
*Deferred: needs the learning engine, and must not fake mastery (D-059).*
1. Optional lightweight "did this land?" check after a completion (1–2 questions), graded
   **server-side**; result recorded as *demonstrated*, labelled separately from activity.
2. Delayed retention: re-surface a previously completed card after a spacing interval and ask
   whether it still holds; record the outcome. Reuses `content_interactions.completed_at`.
3. Tests: a client-submitted score is ignored; mastery derives only from graded attempts;
   retention checks are opt-in and consent-gated.

**Reuse summary:** L1–L4 add 3 columns + 2 tables + 1 function + a confidence multiplier and a
small ranker component. The session engine, admission layer, explanation system, RLS model and
all 395 assertions stay as they are.

---

## 5. Measurable evaluation criteria

How we will know the adaptation works (all computable from existing + new tables):

| Metric | Definition | Target direction |
|---|---|---|
| Recommendation acceptance | completions ÷ cards shown, per session | up, without watch-time rising |
| Cold-start success | first-win rate for users with 0 prior history | holds ≥ MVP target |
| Negative-signal response | after a dislike, share of same-topic/-format cards next session | down, but never to zero (diversity kept) |
| Confidence calibration | high-confidence affinities predict completion better than low | positive gap |
| Difficulty fit | share of completed cards at the person's level | up as level steps up correctly |
| Exploration preserved | discovery-slot completions ÷ discovery-slot shown | stays healthy (no filter bubble) |
| Review honesty | session rating correlates with later retention, not with time spent | positive with retention, ~zero with time |

Each is an aggregate; none exposes an individual's history (suppression + consent rules apply).

---

## 6. Exact tests to add (req 11)

In the existing style — unit for pure ranker logic, DB assertions for functions/RLS, skipped
live e2e until a service exists.

**Cold-start**
1. A brand-new user (no history, no declared topics) gets a sensible, quality-led session (unit).
2. With one declared topic and zero behaviour, declared interest leads; learned affinity is near the prior (unit).

**Negative feedback**
3. A skip lowers the topic affinity gently; a dislike/low rating lowers it more (DB).
4. After negative feedback the next session shows fewer of that topic/format but not none — diversity floor holds (unit).

**Preference change**
5. Changing a declared topic immediately re-weights the feed toward the new choice (unit).
6. An explicit level or format choice overrides any inferred one and is not auto-reverted (DB — extends `level_overridden`).

**Confidence**
7. Two topics with affinity 0.5 but 1 vs 20 observations rank the high-confidence one higher (unit).
8. A single action never moves a recommendation as much as a sustained pattern (unit).

**Exploration diversity**
9. The discovery slot (position 5) still appears and can be completed even for a highly-converged profile (unit — extends `session.test.ts`).
10. No single topic or source exceeds its per-session cap regardless of affinity (unit).

**Seven-piece session adaptation**
11. A session-end review with a low usefulness rating measurably changes the *next* session's mix (DB + unit).
12. Skipping the review leaves the profile unchanged (DB).
13. A review cannot be recorded against another user's session (DB — RLS).

**Privacy/consent (req 8, 12)**
14. Every new field is owner-only readable, included in `export_my_data`, and removed by `delete_my_account` and `reset_learned_preferences` (DB — extends `190`).

---

## 7. Guardrails preserved (req 4, 8, 9, 12)

- **Engagement ≠ learning**: ratings and reviews feed *interest and fit*, never a quality or
  mastery number. Popularity/watch-time/likes stay out of the quality signal (keep D-047/048).
- **Admission independent**: none of this touches Layer B. Only `published` content is ever
  ranked; the review loop cannot admit content.
- **Explicit beats inferred**: declared interest and manual level/format always outweigh
  behavioural inference; confidence scaling makes weak inferences weaker still.
- **Gradual, not reactive**: moving averages + confidence prevent one action from swinging the
  feed.
- **Privacy**: additive fields follow the same RLS, consent gating, export, delete and
  self-reset as everything else; guest-first is unchanged; no new identifiers, no invasive
  tracking.
- **Tests & deploy**: no existing test is weakened; every phase adds tests; production stays off.

---

## 8. Recommendation

Start with **Phase L1 (confidence + ratings)**: it is the smallest change, it directly answers
the requirements most absent today (confidence, explicit-beats-inferred strength), and it makes
every later phase measurable. **Phase L2 (session-end review)** follows, because it is the
owner's explicit req 3 and the natural place to collect the richer evidence L1 can now weigh.

None of this is a rebuild. It is the adaptive layer the foundations were deliberately built to
carry — the `level_overridden` flag, the versioned ranking params (incl. the unused
`levelStepUpCompletions`), the `declared`/inferred split and the component-logged explanations
were all put there for exactly this.
