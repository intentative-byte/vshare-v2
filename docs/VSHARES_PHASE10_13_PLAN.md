# VSHARES — Phase 10.13 plan: Originals Content Factory (implementation prep)

- **Date:** 2026-11-21 · **Branch:** `claude/gallant-mendel-xey567` · **Base:** `c27a98d`
- **Status:** PLAN ONLY. No feature code, no hosted write, no publication. This
  document prepares Phase 10.13 for implementation under its own approvals.
- **Standing gates (locked, non-negotiable):** no live publication · no automatic
  approval · no RLS change · no hosted DB writes/migrations/seed execution · no new
  remote migration · no role/permission changes · no fabricated evidence or
  reviewers · no secrets.

## 1. Objective

Turn the one hand-curated Originals batch into a **repeatable, evidence-backed
factory run** that produces **review-ready Original drafts** for the hardened
editorial workbench (Phase 10.12) — scaling content while keeping every
publication and hosted-write gate closed. The factory prepares; humans review;
only the owner, later, publishes.

## 2. What already exists (reuse, do not rebuild)

- **Factory (pure, local-first, dry-run only):** `src/factory/` — `planner`,
  `pipeline` (`runPipeline: DraftInput[] → FactoryCard[]`, always `dryRun`),
  `rubric`, `safety` (high-impact classification), `evidence`, `dedup`
  (`detectDuplicate`, `NEAR_DUPLICATE_THRESHOLD`), `sources`, `tai`.
- **Live research (gated):** `src/factory/live/` — real retrieval/verification via
  the agent proxy, enabled only with `FACTORY_LIVE=1`; `robots` respected; no
  scraping beyond what's allowed; quotes never fabricated.
- **Multimedia:** `src/factory/media/` — provider validation, oEmbed (metadata
  only, never "factual verification").
- **Editorial surface:** hardened workbench + `review-state.ts` (10.12),
  governance ledger (migrations 10 & 11), RLS staff gate, two-reviewer quorum.
- **DB bridge (existing, draft-only):** `public.create_card` via
  `content.createCard` (`access:"moderator"`) → inserts a **draft** with an
  **unchecked link** (cannot publish). The factory must never bypass this.
- **Originals artifacts:** `docs/VSHARES_ORIGINALS_BATCH_1.md`,
  `docs/samples/originals-evidence.json`, `docs/VSHARES_ORIGINALS_REVIEW_PACK.md`,
  `docs/VSHARES_ORIGINALS_PUBLICATION_PROCEDURE.md` (owner-run, dev-only).

## 3. Data contract (the bridge to build)

`FactoryCard` (`src/factory/types.ts`) already carries everything `create_card`
needs plus evidence/quality/safety/freshness. The missing piece is a **reviewed,
pure mapping**:

```
FactoryCard  ──(pure, no I/O)──▶  CreateCardInput (existing Zod schema)
                                   + an Evidence record for the review pack
```

- Map: slug, topicId (resolved from topic slug — lookup, not invented), source,
  title, summary, takeaways, nextStep, format, level, estimatedMinutes,
  qualityScore (from rubric), `isAiAssisted: true`.
- **Never** set status, link-check, or publication — `create_card` owns those.
- Output of a factory run is **drafts + an evidence pack**, not published content.

## 4. Scope

**In:**
1. **Factory→draft bridge** — a pure `toCreateCardInput(card)` with unit tests;
   plus a local, idempotent "import as drafts" path (seed-style SQL to a **local**
   scratch DB, or a gated admin importer) that goes through `create_card`.
2. **Batch 2 Originals** — N new drafts generated via the factory with **real**
   evidence (live-gated) or honestly flagged `unsupported`; safety/high-impact
   classified; deduped against batch 1 and the seed (`NEAR_DUPLICATE_THRESHOLD`).
3. **Evidence + review pack** — per-card evidence JSON and review-pack entries;
   no fabrication; a reachable URL is never treated as proof.
4. **Workbench integration check** — the authoritative board (10.10/10.12) renders
   the new drafts **only where real persisted records exist** (local scratch for
   verification); fixtures stay in `/dev` previews.

**Out / locked:** publication (`moderate_content` publish stays owner-gated),
hosted writes/seed execution, auto-approval, new remote migrations, role changes.

## 5. Task breakdown (ordered, each independently testable)

| # | Task | Deliverable | Gate |
|---|---|---|---|
| T1 | Dedup baseline | Load existing seed + batch-1 slugs/titles; a report of what batch 2 must not duplicate | local |
| T2 | `toCreateCardInput` bridge | Pure function + unit tests (maps every field, refuses to set status/publish) | local |
| T3 | Batch-2 generation | `DraftInput[]` → `runPipeline` with live evidence (`FACTORY_LIVE=1`), deduped | live-gated |
| T4 | Evidence + review pack | `docs/samples/originals-batch-2-evidence.json` + review-pack doc; unsupported flagged | local |
| T5 | Local DB verification | Apply drafts via `create_card` to a **scratch** DB; assert all stay `draft`, `link_checked_at IS NULL`, 0 published, 0 decisions | local DB |
| T6 | Workbench check | Board renders the new drafts with correct review-state/badges (local) | local |
| T7 | Tests | Unit (bridge, dedup, evidence gating), DB case (draft-only invariants), keep axe/e2e green | local |
| T8 | Report + activation | Delivery report; hosted/publication steps left to owner approval | docs |

## 6. Test strategy (kinds kept distinct)

- **Unit (deterministic):** bridge mapping, dedup threshold, rubric/safety,
  evidence gating (unsupported when no quote). No network.
- **Live-gated integration:** real research/verification only with `FACTORY_LIVE=1`
  through the proxy; skipped by default; never asserts a specific live quote.
- **Local DB:** a scratch PostgreSQL case proving factory-imported cards are
  **drafts, unpublished, link-unchecked** — i.e. the factory cannot shortcut the
  gates.
- **Hosted:** **BLOCKED** (no anon key / admin login); not claimed.

## 7. Acceptance criteria

- Batch-2 drafts generated, each with a real or honestly-flagged evidence record;
  no near-duplicates of batch 1 / the seed.
- Every generated card is a **draft, unpublished, link-unchecked** locally — the
  factory never publishes or approves.
- The workbench shows the new drafts with correct review states.
- All local automated tests pass; nothing published; no hosted write.
- Report lists the owner-gated steps (link checks, human review, second reviewer
  for high-impact, publication) that remain.

## 8. Risks & blockers

- **Live research** depends on proxy/network and site `robots`; some claims will
  come back `unsupported` and need human grounding (by design, not a defect).
- **Hosted verification/publication** stays blocked on the anon key and the
  admin's magic-link sign-in; batch-2 reaching hosted dev is a **separate,
  owner-authorised** step (seed ≠ migration).
- **Topic resolution:** `create_card` needs a real `topicId`; batch-2 topics must
  map to existing taxonomy or be added via the taxonomy admin (owner), not invented.

## 9. Recommended first implementation step

Start with **T1 + T2** (dedup baseline + the pure `toCreateCardInput` bridge with
unit tests) — they are fully local, deterministic, and unlock everything else,
with zero network and zero hosted exposure. Generation (T3) follows under a
decision to run live research.

**All publication and hosted-write gates remain locked. STOP for owner review
before implementation begins.**
