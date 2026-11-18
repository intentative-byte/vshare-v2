# VSHARES — Architecture Recovery and Gap Audit

- Date: 2026-11-17 · Read-only audit. **No code, migration or test was changed to produce this.**
- Method: inspection of the repository, the eight specification documents, the seven
  migrations, the test suites, the engineering reports, Git history and the six legacy
  `cursor/*` branches. Evidence is cited by exact path.
- Scope note: this audit **distinguishes what is implemented from what was planned or
  claimed.** "Working" means code exists and tests pass; "reserved" means a hook exists but
  no behaviour; "missing" means neither.

---

## 0. The central finding

**Today's "VAI" is one of three layers, not three.** The owner's vision uses "VAI" for an
intelligence that *discovers* content, *admits* it on quality and credibility, and *ranks* it
for each person. The implemented VAI is the **ranker only** — Layer C. Layers A (discovery)
and B (admission) are performed **by people**, through the admin interface and editorial
review, not by software.

This is not a defect. It is exactly the MVP the master spec approved: *"VSHARES links to
sources and attributes them. It does not copy, host or scrape third-party content"*
(`VSHARES_MASTER_SPEC.md` B3), with automated ingestion reserved as a schema hook *"without
building either now."* The gap between the grand vision and the build is **real, intended,
and recoverable** — and the schema already carries the hooks for it.

| Layer | Vision | Built? | Who does it today |
|---|---|---|---|
| **A — Discovery** | Find candidates from YouTube, X, Instagram, Facebook, the web | **No** | The curation team, by hand, via `/admin/cards/new`; and users, via `/you/submit` |
| **B — VAI Admission** | Judge accuracy, credibility, substance, appropriateness | **No (automated)** | Human moderators via `moderate_content`; a human-set `quality_score`; a link-check gate |
| **C — Personalised Ranking** | Recommend approved content to the right person | **Yes, fully** | `src/modules/vai/ranker.ts` — a deterministic, tested, explainable weighted sum |

Everything below elaborates this with evidence.

---

## 1. Original vision versus current reality

The authoritative statement of the vision is `VSHARES_MASTER_SPEC.md` Part A (owner-approved),
elaborated per feature in `VSHARES_FEATURE_REGISTER.md` (F-001…F-131) and in the owner's two
master directives. Current reality is Milestones 1–8, built and tested.

| Pillar | Vision | Reality | Verdict |
|---|---|---|---|
| Value-curated scrolling | Finite, ranked, explainable sessions that move you forward | LEARN delivers 7-card sessions ranked by VAI with "Why this?" | **Delivered (MVP)** |
| Knowledge-first catalogue | Real, attributed, link-checked resources; no scraping | Curated + user-submitted cards, draft→review→published, link-check gate | **Delivered (MVP)** |
| VAI intelligence | Discover + admit + rank + mentor + next-best-move | Rank + next-best-*content*; mentor/admission/discovery not built | **Partial — Layer C only** |
| Personal development | Paths, quizzes, mastery, applied learning, User DNA | Preference memory + activity progress; the rest reserved (R2) | **Partial (foundations)** |
| Platform intelligence | Content Flow, Value Leak Index, Platform Alignment Score | Essential funnel + derived rollups; the three named engines not built (R3) | **Partial — measurement only** |
| Creator ecosystem | Profiles, reputation, publishing, analytics | Submissions + moderation; `creators` module is an empty stub (R3) | **Partial — submissions only** |
| Privacy & governance | RLS, consent, export, delete, audit, moderation | All present and tested (395 DB assertions) | **Delivered (MVP), strong** |
| External reach | YouTube/X/IG/FB/web discovery, opportunities, marketplace | None; `origin='ingested'` reserved, unused | **Not built (by scope) — Expansion** |

**Reality is ahead of the vision on governance and honesty, and behind it on autonomous
intelligence.** The product today is a well-governed, human-curated, personally-ranked
knowledge feed. The vision's "operating system for becoming" is largely unbuilt beyond its
MVP foundations — as planned.

---

## 2. Complete feature inventory (evidence-based gap table)

Status key: **working** (code + passing tests) · **partial** · **reserved** (hook only, no
behaviour) · **missing** · **unverified** (built, not run against a live service).

### Layer C — Personalised ranking (the implemented VAI)

| System | Intended | Implementation (paths) | Status | Evidence | Priority |
|---|---|---|---|---|---|
| Deterministic ranker | Multi-signal, explainable rank | `src/modules/vai/ranker.ts` | **working** | 24 ranker unit tests; 59 feed/interaction DB assertions | — (done) |
| Finite sessions | 7 cards, ends with a next step | `src/modules/vai/session.ts`; `feed_sessions` table | **working** | 22 session tests; `170_feed_sessions.sql` (38) | — |
| Explanations | From logged evidence, not a story | `src/modules/vai/explain.ts`; `recommendations.components` | **working** | explanation unit tests; D-050 | — |
| Next Best (content) | One recommendation + its reason | `src/modules/vai/next-best.ts` | **working** | 7 next-best tests | — |
| Topic memory / affinity | Learned from real actions | `user_topics.affinity`; `app.apply_affinity()` | **working** | `160_interactions.sql` (21) | — |
| Impression / source variety | No pointless repeats | ranker penalties; session variety rules | **working** | ranker + session tests | — |
| Personalisation off-switch | Rank on quality/freshness only | `scoreCandidate` personalised branch; `preferences` | **working** | ranker tests | — |

### Layer B — Admission (human today; automation missing)

| System | Intended | Implementation (paths) | Status | Evidence | Priority |
|---|---|---|---|---|---|
| Editorial approval & publication | Draft → review → publish, auditable | `moderate_content()`; `/admin/cards/[id]`, `/admin/queue` | **working** | `110_card_lifecycle.sql`, `230_admin_access.sql` | — |
| Link-check gate | Can't publish an unchecked link | `record_link_check()` (service-role only); publish constraint | **working** | `110`, D-039; `scripts/check-links.mjs` (not yet run) | — |
| High-impact second review | Finance/health need a second reviewer | `moderate_content` self-approval block; `is_high_impact` from category | **working** | `120_high_impact.sql` (6) | — |
| Editorial quality score | Rank useful content higher | `content_items.quality_score` (0–100, **human-set**) | **working (manual)** | ranker `qualityComponent` | — |
| **Automated educational-value scoring** | VAI judges substance/usefulness of a candidate | — | **missing** | — | **R3, high** |
| **Source credibility / factual reliability** | Score a source's trustworthiness | `VSHARES_EDITORIAL_CHECKLIST.md` (human checklist only) | **missing (automated)** | — | **R3, high** |
| **Automated admission / rejection** | Admit or reject a candidate by rule | — (the `ingested` origin is reserved) | **missing** | `content_origin='ingested'` unused | **R3** |

### Layer A — Discovery (entirely manual/absent)

| System | Intended | Implementation (paths) | Status | Evidence | Priority |
|---|---|---|---|---|---|
| Manual curation | Team adds cards | `/admin/cards/new`; `create_card()` | **working** | `230_admin_access.sql` | — |
| User submissions | Public proposes resources | `/you/submit`; `submit_resource()` | **working** | `130_submissions.sql` (15) | — |
| **YouTube / X / Instagram / Facebook / web discovery** | Pull candidates from external platforms | — (no API client anywhere) | **missing** | grep for `youtube/googleapis/twitter/rss`: none | **Expansion — needs legal/API spec** |
| Ingestion pipeline | Normalise, dedupe, attribute external items | `content_kind`, `content_origin='ingested'`, licence fields reserved | **reserved** | `catalogue.sql:24,17` | **R3/Expansion** |

### Personal development

| System | Intended | Implementation | Status | Evidence | Priority |
|---|---|---|---|---|---|
| Preference memory (User DNA foundation) | Inspectable, correctable | `user_topics`, `preferences`; `personalisation` module | **working (memory)** | DB tests | — |
| Progress dashboard | Activity / Knowledge / Applied separate | `src/modules/progress`; `/you` | **partial (activity only)** | progress unit/DB tests; D-059 | MVP done; R2 for knowledge/applied |
| Learning paths, quizzes, mastery | ZERO → COMPETENT, demonstrated | `src/modules/learning/index.ts` — **empty stub (19 lines)** | **reserved** | no tables, no code | **R2** |
| Quests / daily missions | Learning into action, no streak pressure | — | **missing** | — | R2 |
| Applied Learning | Commit, log, reflect, evidence | — | **missing** | — | R2 |
| User DNA view | Inspect/correct the model | — (data exists; no view) | **missing (view)** | — | R2 |
| LLM mentor | Grounded, metered, never grades/ranks | `src/modules/vai/model-provider.ts` — **interface only, no adapter** | **reserved** | by design (the file states it) | R2, needs provider+budget approval |

### Platform intelligence & governance

| System | Intended | Implementation | Status | Evidence | Priority |
|---|---|---|---|---|---|
| Content Flow Intelligence | IMPRESSION→…→SHARE funnel; flow map | Essential funnel: `analytics_daily`, derived rollups, dashboard | **partial** | `210/220_analytics*.sql` (76); `/admin/metrics` | MVP funnel done; **R3** flow map |
| **Value Leak Index** | Where attention is wasted | — | **missing** | named in spec A3 only | **R3** |
| **Platform Alignment Score** | Configurable mission indicator | — | **missing** | named in spec A3 only | **R3** |
| Retention intelligence | Consent-based triggers, cooldown, "no intervention" | — (guest-purge lifecycle only) | **missing** | `VSHARES_GUEST_LIFECYCLE.md` is retention of *data*, not *users* | R3 |
| Creator reputation & analytics | Usefulness, outcomes | `src/modules/creators/index.ts` — **empty stub (16 lines)** | **reserved** | no tables, no code | R3 |
| Privacy / consent / export / delete | Full UK-GDPR control | `data_rights` migration; `export_my_data`, `delete_my_account` | **working (DB); unverified live** | `190_data_rights.sql` (33) | live erasure = release blocker |
| Moderation & audit | Reports, actions, append-only trail | `content_reports`, `moderation_actions`, `audit_log`; `/admin/audit` | **working** | `140_reports_and_audit.sql` (16) | — |
| Security boundary | RLS on every table | all migrations; 23 tables, all RLS, 35 policies | **working** | 395 DB assertions; `VSHARES_SECURITY_REVIEW.md` | — |

---

## 3. VAI algorithm recovery report (complete, with exact values)

Fully recovered from `src/modules/vai/ranker.ts` and the versioned seed in
`supabase/migrations/20261114150000_feed.sql:676`. The weights live in a `ranking_configs`
row (version 1, active) so any change is auditable and a past recommendation can be
re-explained by the weights then in force.

### Score = weighted sum of seven components, minus two penalties

```
score = Σ (weightᵢ × componentᵢ)  −  impressionPenalty  −  sameSourcePenalty
```

Every component is clamped to [0,1]; the final score is rounded to 4 places; ties break on
`publishedAt` then `id` (total, reproducible order).

| Component | Weight (v1) | Formula | Meaning |
|---|---|---|---|
| declaredInterest | **0.30** | 1 if primary topic chosen; 0.5 if a secondary match; else 0 | What the person asked for |
| learnedAffinity | **0.20** | `affinityByTopic[topic] ?? 0.2` | What their actions reveal (default 0.2, not neutral) |
| quality | **0.20** | `quality_score / 100` | Editorial quality (human-set) |
| levelFit | **0.10** | 1 if same level; 0.5 one step; 0 two steps | Right difficulty |
| engagementQuality | **0.10** | `(completions + 0.35×20) / (impressions + 20)` | Smoothed **completion** rate — never a click rate |
| freshness | **0.05** | `exp(−ageDays / 90)` | Gentle recency decay |
| timeFit | **0.05** | 1 if ≤ preferred minutes; →0 at 4× preferred | Fits the session |

**Penalties** (applied only when personalisation is on):
- `impressionPenalty = min(0.15, timesSeenUnopened × 0.05)` — repeats fade, capped.
- `sameSourcePenalty = 0.05` if the source appeared in the last 48h of completions.

**Session params (v1):** `sessionSize 7`, `repeatWindowHours 48`, `maxConsecutiveSameTopic 2`,
`maxPerSource 2`, `discoveryPosition 5` (one deliberately-out-of-profile card at slot 5),
`levelStepUpCompletions 5`, `engagementPrior 20 impressions @ 0.35`, `freshnessHalfLife 90d`.

**Personalisation OFF** zeroes `learnedAffinity`, `levelFit`, `timeFit` and both penalties —
the feed still ranks on declaredInterest, quality, engagement and freshness.

### Affinity learning (the "topic memory") — `app.apply_affinity()`

Moving average `new = old + (target − old) × rate`, clamped, rounded to 3 places:

| Action | target | rate |
|---|---|---|
| complete | 1.0 | 0.15 |
| save | 1.0 | 0.10 |
| like | 1.0 | 0.10 |
| skip | 0.0 | 0.10 |
| feedback "useful"/"not useful" | 1.0 / 0.0 | 0.20 |

Declared topics start at **0.500**; an undeclared topic touched by an action starts at **0.200**.

### Design guarantees (recovered, with their decisions)

- **Never popularity-as-quality** (your §3 rule): the only popularity signal is a *completion*
  rate, smoothed with a 20-impression prior, so a 3-impression card neither dominates nor is
  buried; with no data the component equals the prior, a stated assumption not an invented
  number (D-047).
- **Opening ≠ completing** (D-048); a model never decides a rank (`model-provider.ts`, D-063-ish).
- **Explanations are evidence**: every served card is logged with its component breakdown and
  "Why this?" is generated from that log (D-050).

---

## 4. The three intelligence layers — explicit map

```
                 ┌─────────────────────────── VSHARES vision of "VAI" ───────────────────────────┐
  LAYER A         LAYER B                         LAYER C
  DISCOVERY  ──▶  ADMISSION                 ──▶   PERSONALISED RANKING
  (find)          (is it accurate, credible,       (recommend to the right
                   substantial, appropriate?)        person, by their history)

  TODAY:
  • Admin UI       • moderate_content() [human]      • ranker.ts  ✅ FULLY BUILT & TESTED
    /admin/cards   • quality_score [human 0–100]     • finite sessions, explanations
  • /you/submit    • link-check gate [service-role]  • affinity learning, discovery slot
  • origin=        • high-impact 2nd review          • personalisation off-switch
    'ingested'     • NO automated credibility/
    (reserved)       factual/value scoring ❌
  • NO external
    discovery ❌
```

**Rule honoured throughout (your §3): popularity is never educational quality.** Layer C uses
completion rate, not clicks; Layer B's quality is editorial, not viral. When Layers A/B are
built, the same rule must hold: a credibility/value score must be independent of view counts.

---

## 5. Missing architecture and integration map

What must be added to realise Layers A and B, preserving the current stack (Next.js /
TypeScript / Supabase / RLS) and all safeguards.

| Capability | New module / table (proposed) | External dependency | Guardrails that must hold |
|---|---|---|---|
| External discovery (A) | `discovery` module; `discovery_sources`, `discovery_candidates` tables (origin `ingested`) | YouTube Data API, X API, Meta Graph API, web fetch — **each needs approved API terms, rate limits, attribution** | No scraping; link + attribute only; dedupe by canonical URL; store provenance |
| Automated value scoring (B) | `vai/value-score` (pure, explainable) | Optionally the `model-provider` interface (metered, grounded) | Deterministic core; a model never *decides* admission, only proposes; every score explainable |
| Credibility / factual reliability (B) | `vai/credibility`; `source_reputation` table | All/deny lists; optional fact signals | Independent of popularity; human override always wins; auditable |
| Admission pipeline (B) | `admission` service: candidate → score → auto-reject below floor → **queue for human approval** (never auto-publish) | — | Nothing auto-publishes; the human + link-check + high-impact gates stay in force |
| Content Flow map (intelligence) | extend `analytics` (derived rollups already exist) | — | Aggregate only; suppression threshold; no individual histories |
| Value Leak Index / Alignment Score (intelligence) | `analytics` views over the flow funnel | — | Configurable, explainable, no vanity metrics |
| Creator reputation (R3) | fill `creators` module; `creators`, `creator_reputation` tables | — | Reputation from usefulness/outcomes, not volume |
| Learning engine (R2) | fill `learning` module; paths/lessons/quizzes/mastery tables | optional LLM mentor | Server-side grading; demonstrated ≠ claimed; RLS on all |

**Integration principle:** external platforms enter only through Layer A, write only
`draft`/`ingested` rows, and **must pass Layer B (incl. a human) before Layer C can ever show
them.** This keeps the publication safeguards (D-039, D-040, D-042) intact for machine-found
content exactly as for hand-curated content.

---

## 6. Prioritised recovery roadmap (phased; preserves all existing work)

Nothing here resets the database, weakens RLS/privacy/publication safeguards or tests, or
auto-publishes existing drafts. Each phase ends with tests and an engineering report, as every
milestone has.

**Phase R1 — finish the MVP's live proof (highest priority, already in flight).**
Clear the 72 live-service checks, verify erasure end-to-end, measure the 60-second first-win
benchmark, publish a link-checked catalogue. *This is a precondition for everything below —
you cannot tune discovery/admission without real usage.* Owner action: the dev project (in
progress).

**Phase R2 — learning engine + User DNA + mentor** (the vision's "personal development").
Fill the `learning` module (paths, quizzes, server-side grading, mastery), the Applied-Learning
log, the User DNA view, and — if a provider+budget is approved — the grounded LLM mentor behind
`model-provider.ts`. Keeps progress tiers honestly separate (D-059).

**Phase R3a — platform intelligence** (cheap, high-insight, no external deps).
Build the Content Flow map, Value Leak Index and Platform Alignment Score as `analytics` views
over the funnel that already exists. Add consent-based retention intelligence. All aggregate,
suppressed, explainable.

**Phase R3b — automated admission (Layer B)** before discovery (Layer A), deliberately.
Build the deterministic value-score and credibility score as an *assistant to* human
moderation first: it ranks the review queue and can auto-*reject* clear failures, but **never
auto-publishes**. This hardens the gate before any firehose of machine-found candidates arrives.

**Phase R4 — external discovery (Layer A), one source at a time.**
Start with a single approved API (e.g. YouTube Data API) under its terms, writing `ingested`
drafts that flow through Layer B + human approval. Add sources only after dedupe, attribution
and copyright compliance are proven for the first.

**Expansion — creators, social, opportunities, marketplace.** Each needs its own approved
product, legal and commercial spec, as the master spec already states.

---

## 7. Recommended next development milestone

**M9 — Live MVP validation (Phase R1).** Not a new system: prove the built one works against
real services and a real catalogue. It is the gate the owner has already prioritised, it needs
no new architecture, and it produces the usage data without which tuning discovery or admission
would be guesswork. Concretely: clear the 72 live checks, verify erasure, measure the first-win
benchmark with a real sample size, and publish the first link-checked cards.

The first *new-capability* milestone after that is **M10 — VAI Admission Assist (Phase R3b)**:
a deterministic, explainable value/credibility score that orders the moderation queue and
auto-rejects clear failures, with **zero change to the auto-publish rule** (there is none). It
is the highest-leverage step toward the "VAI" of the vision because it hardens Layer B before
Layer A can ever feed it.

---

## 8. Exact acceptance tests for the missing systems

Written now so the systems are built to a bar, not to a demo. Each mirrors the project's
existing test style (DB assertions in `supabase/tests/cases/`, unit tests for pure logic,
skipped live e2e until a service exists).

### Layer B — VAI value/credibility scoring (M10)
1. **Deterministic**: the same candidate scores identically on repeated runs (unit).
2. **Explainable**: every score returns its component breakdown; no component is a black box (unit).
3. **Popularity-independent**: two candidates identical but for view count score the same — view count is not an input (unit). *Directly enforces your §3.*
4. **Human override wins**: a moderator decision always supersedes the machine score; the DB records both (DB).
5. **Never auto-publishes**: a high machine score leaves status `draft`/`pending`; only `moderate_content` by a human publishes, and only with a link check (DB — extends `110`).
6. **Auto-reject is reversible**: an auto-rejected candidate can be restored to the queue by a human (DB).
7. **High-impact still needs a second human** even at a top machine score (DB — extends `120`).
8. **Audited**: every machine admission decision writes an `audit_log` row with no PII (DB).

### Layer A — external discovery ingestion (M4+/R4)
9. **Attribution preserved**: an ingested item stores source URL, platform, author/channel, and licence; publishing without attribution is refused (DB).
10. **No duplicates**: ingesting the same canonical URL twice creates one candidate, not two (DB).
11. **Enters as draft/ingested only**: ingestion can never produce a `published` row (DB).
12. **RLS unchanged**: a learner/anon cannot read `discovery_candidates`; only staff can (DB).
13. **Rate/terms respected**: the client honours the source API's rate limit and stops cleanly on 429 (unit, mocked).
14. **Provenance in the audit trail**: each ingest batch is audited with source and counts (DB).

### Platform intelligence (R3a)
15. **Flow funnel reconciles**: IMPRESSION→COMPLETE→SAVE→SHARE counts derived from the product tables match a fresh count (DB — mirrors `reconcile_day`).
16. **Suppression holds**: any flow/leak breakdown below the threshold is withheld (DB — mirrors `220`).
17. **No individual histories**: the flow map and alignment score expose aggregates only; staff cannot read one person's path (DB).
18. **Explainable alignment**: the Platform Alignment Score returns its inputs and weights, like the ranker (unit).

### Learning engine (R2)
19. **Server-side grading**: a quiz result is computed server-side; a client-submitted score is ignored (DB).
20. **Demonstrated ≠ claimed**: mastery records derive from graded attempts, never from self-report, which is labelled separately (DB — honours D-059, rule A2.5).

---

## 9. Legacy recovery notes (what the old implementations held)

| Source | What it was | Disposition | Carried into |
|---|---|---|---|
| `main` (pre-rebuild `app/`, `lib/`, `components/`) | A simpler posts/feed/onboarding app with a cookie demo-bypass | Replaced in M1; bypass removed | patterns only; no code |
| `cursor/vshare-v2-foundation-b385` (PR #1) | Normalised schema + a single-SQL `get_feed_items()` ranker | Closed, kept as reference | ranker split into `ranker.ts`; `content_memory`→`content_interactions`; `content_events`→`analytics_events` |
| `cursor/optional-supabase-demo-791a` (PR #5) | ~140 browser-local "V3–V20" modules (digital twin, market graph, decision engines…) computing scores from one user's `localStorage` | Closed, concept archive; **the branch's own notes call the outputs deterministic local heuristics with disconnected persistence** | concepts mapped to roadmap in `VSHARES_PR_DISPOSITION.md`; **no code carried** |
| `cursor/render-deployment-readiness-ff8e` (PR #3) | Render deploy config | Superseded (host-agnostic, D-033) | nothing |
| `cursor/safe-env-diagnostics-0c16` (PR #4) | Public env-check endpoint | Not kept (leaks config) | the *idea* → `platform/env.ts` boot validation |

**Conclusion on legacy:** there is no hidden, superior VAI buried in the branches. PR #1's SQL
ranker is the genuine ancestor of today's ranker (and was improved: unit-testable, explainable,
versioned weights). PR #5's "engines" are concept art over local heuristics, correctly not
carried. The real, tested intelligence in the repository is Layer C, and it is the best version
of that logic the project has produced.

---

## 10. Guardrails this audit recommends preserving (non-negotiable)

Any recovery work must keep, unchanged:
- **RLS on every table** (23/23, 35 policies) and the server-write-only integrity tables.
- **The publication gate**: draft-only entry, service-role link check, high-impact second human
  review — for machine-found content exactly as for hand-curated (D-039/40/42).
- **No auto-publish of existing drafts** — including the 10 batch-1 cards, which await link
  checks and editorial sign-off.
- **Consent-first measurement**, suppression, and the honest-metrics rules (no popularity-as-quality, no fabricated scores, explainable everything).
- **The test bar**: 192 unit, 395 DB, 90 e2e; every new system lands with tests in the same style.
- **No production deploy, no merge of PR #8** without explicit approval.

---

### Appendix — evidence index (primary paths)

- VAI ranker & formula: `src/modules/vai/ranker.ts`; weights `supabase/migrations/20261114150000_feed.sql:676`.
- Sessions/explanations/next-best: `src/modules/vai/{session,explain,next-best}.ts`.
- Admission (human): `moderate_content`, `record_link_check`, `create_card` in `supabase/migrations/20261114140000_catalogue.sql`; admin UI `src/app/admin/*`, `src/components/admin/*`.
- Reserved hooks: `content_origin='ingested'`, `content_kind` (`catalogue.sql`); `src/modules/{learning,creators}/index.ts` (stubs); `src/modules/vai/model-provider.ts` (interface).
- Measurement: `supabase/migrations/20261114180000_analytics.sql`; `/admin/metrics`.
- Vision: `VSHARES_MASTER_SPEC.md` (A3, B3); `VSHARES_FEATURE_REGISTER.md`; `VSHARES_PR_DISPOSITION.md` (legacy map).
- Governance: `VSHARES_SECURITY_REVIEW.md`; `VSHARES_DATA_INVENTORY.md`; 395 assertions in `supabase/tests/cases/`.
