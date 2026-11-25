# VSHARES — Phase 10.2 report: Content Factory + TAI (first working version)

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **What this is:** a working, local-first, **dry-run** implementation of the
  Content Factory and TAI (Trend Artificial Intelligence) from Phase 10.1. It
  can take a curriculum topic or an observed trend, research/structure it,
  produce an educational draft, attach evidence, grade its usefulness and safely
  prepare it for **human** editorial review — without publishing, writing to the
  database, or inventing citations or trend metrics.
- **Non-negotiables honoured:** no remote DB write · no automatic publication ·
  no migration applied · no RLS change · no live write test · **no invented
  citations** · **no fabricated trend scores** · no deploy · no merge · the
  existing VAI ranking and security controls are untouched.

## What was built (all under `src/factory/`, pure TypeScript, no DB, no network, no new deps)

| Module | Responsibility |
|---|---|
| `types.ts` | typed interfaces for cards, evidence, rubric, safety, TAI |
| `sources.ts` | source verification + credibility from a curated reputable-publisher allowlist (official / institution / named-expert) |
| `dedup.ts` | URL normalization + title-similarity; mirrors the DB `source_url` UNIQUE guarantee and adds near-duplicate detection |
| `evidence.ts` | claim-level fact-check: a claim is "verified" **only** with a supplied supporting quote; a cited-but-unquoted claim is `cited_pending_verification`; no source ⇒ `not_verified` |
| `safety.ts` | high-impact classification + risk-phrase escalation; high-impact ⇒ independent second reviewer |
| `rubric.ts` | the 8-axis quality rubric with **hard floors** (a high composite cannot override a critical failure) |
| `pipeline.ts` | RESEARCH→VERIFY→DRAFT→FACT-CHECK→GRADE→EDITORIAL QUEUE; **default-deny writes** (any `publisher` throws); never emits a "published" state |
| `tai.ts` | trend ingestion, normalization, clustering, momentum from **real observations only**, classification, credibility, expiry, evidence-backed proposals |
| `planner.ts` | curriculum balance: essentials reserved and placed first; trends only fill leftover capacity — popularity never displaces essential material |
| `fixtures.ts` | deterministic demo inputs reusing real seed sources + illustrative trend observations |

## Tests (test-first behaviours — `tests/unit/factory/`, `tests/integration/`)

30 factory unit tests + a demonstration integration test, all passing, covering
every behaviour the brief named:

- invalid source rejection · missing-evidence never treated as verified ·
  duplicate detection (exact/normalized/near) · quality-threshold + floor
  enforcement · high-impact escalation · trend **category classification** ·
  **insufficient momentum** (observation/source thresholds) · **stale trend**
  expiry · source credibility / single-source handling · **default-deny write
  protection** (a publisher throws) · **prevention of automatic publishing**
  (only review states are reachable) · **deterministic output from fixed
  fixtures**.

Full suite stays green (see Verification).

## Demonstration (local, dry-run) — `docs/samples/`

- `factory-draft-cards.json` — **8 evidence-backed draft cards** across Personal
  Finance, Technology & AI, Cybersecurity, Health, Careers, Practical/Business,
  Personal Development/Learning and Science. All reach `editorial_queue`; **all
  8 are flagged `requiresFactCheck`**; the 2 high-impact cards (Budgeting, Sleep)
  require an **independent second reviewer**.
- `tai-trend-report.json` — a sample trend report that **declares no live source
  is connected** and marks real-world momentum **NOT VERIFIED**; it shows one
  proposable multi-source trend (passkeys → security-basics), one
  `insufficient_data` trend, and one stale/expired unclassified trend.
- `quality-audit.md` — the human-readable evidence & quality audit.

### Honesty of the demonstration (important)
No page was fetched in this environment, so **no supporting quote was supplied**
and **no claim is marked verified**. Every draft is `cited_pending_verification`
and routed to a human. The trend observations are **explicit fixtures**, not live
data; momentum is computed from them only to demonstrate the algorithm.

## Limitations (stated plainly)

1. **No live research/fetch.** Source pages were not retrieved, so claim-level
   verification is deferred to humans. A future live version adds a Source-
   Verification/link-check adapter that records `retrievedAt` and extracts
   supporting quotes — behind robots/licensing/rate-limit compliance.
2. **No live trend sources.** TAI adapters are injected; only the fixture adapter
   is wired. Real adapters (approved APIs/RSS) are a Phase 10.3 item and must
   respect licensing, attribution and robots.
3. **Reputable-source allowlist is small and curated.** It is deliberately
   conservative (unknown domains are rejected, not guessed); it grows by review.
4. **The factory does not touch the database.** It prepares drafts; a human still
   runs `create_card`/`moderate_content` through the existing gates. No
   `content_evidence` table exists yet (proposed Phase 10.1 migration, not
   applied).
5. **Determinism depends on a fixed clock** (`now`); callers must pass it for
   reproducible output (the demo does).

## Phase 10.3 proposal (owner-gated; nothing here is authorised)

1. **Live Source-Verification adapter** (opt-in, rate-limited, robots-aware):
   resolve each `source_url`, record `retrievedAt`, and extract candidate
   supporting quotes for the Fact-Check agent — upgrading claims from
   `cited_pending_verification` only when a real quote is found.
2. **`content_evidence` migration** (proposed in 10.1): additive table + its
   cross-user RLS test; owner approves before applying.
3. **One real approved trend adapter** (e.g., an official RSS feed) behind the
   TAI adapter interface, with licensing/attribution recorded; still proposal-
   only output.
4. **Editorial queue surface**: render the factory's evidence bundles in
   `/admin/cards` so a moderator reviews, link-checks (`check:links`) and
   approves — the first real publish, **owner-authorised, through the DB gates**,
   targeting ≥7 cards incl. Budgeting (the pilot gate).
5. **Coverage view + planner wiring** to produce the real gap list for batch 500.

## Verification (this phase, exact)

| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (0 warnings) |
| `npm run check:hygiene` | **PASS** (308 tracked files) |
| `npm test` (unit + integration) | **PASS — 243 passed (18 files)** incl. 30 factory + the demo |
| `npm run test:e2e` | **PASS — 90 passed / 72 skipped / 0 failed** |
| `npm run build` | **PASS** |

**STOP after Phase 10.2 for owner review.** No later phase is authorised.
