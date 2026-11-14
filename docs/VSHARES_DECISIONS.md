# VSHARES — Decision Log

Format: one entry per decision. Status is `proposed`, `accepted` (owner-approved or within engineering authority), or `superseded`.

## D-001 — Project documents live in `docs/`
- Date: 2026-11-14 · Status: accepted (engineering)
- Decision: all `VSHARES_*.md` documents are kept in `docs/`; `CLAUDE.md` stays at the repository root.
- Rationale: nine documents at the root would bury the code; `CLAUDE.md` must be at the root to be loaded automatically.

## D-002 — Treat the PR #5 "V3–V20 engine" branch as an archive, not a base
- Date: 2026-11-14 · Status: proposed (needs owner confirmation via Q6/Q8)
- Decision: do not merge or port the 140 heuristic modules on `cursor/optional-supabase-demo-791a`.
- Rationale: they compute precise-looking scores from browser-local state with no real data or backend; the branch's own readiness doc labels them mock. Presenting them as product intelligence would mislead users.
- Consequence: ideas remain available for Phase 8 evaluation.

## D-003 — Modular monolith on Next.js + TypeScript + PostgreSQL (Supabase)
- Date: 2026-11-14 · Status: proposed (finalise in Phase 1)
- Rationale and alternatives: see `VSHARES_PROJECT_DISCOVERY.md` §7.

## D-004 — Start the data model from PR #1's schema, not `main`'s
- Date: 2026-11-14 · Status: proposed (finalise in Phase 1)
- Rationale: normalised topics, per-user memory and append-only events support the stated product (no repeats, behaviour-driven weighting); `main`'s `text[]` topics and unused `saved_posts` do not.

## D-005 — No authentication bypass for demos
- Date: 2026-11-14 · Status: accepted (engineering; directive rule 4)
- Decision: the `vshare_demo_mode` cookie bypass will not be carried into the rebuild. Any preview experience will be a genuinely public, read-only surface.
