# VSHARES — Decision Log

One entry per decision. Status: `accepted` (owner-approved, or within engineering authority) · `proposed` · `superseded`.

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 2026-11-14 | Project documents live in `docs/`; `CLAUDE.md` at the root | Keeps the root readable; `CLAUDE.md` must be at the root to load | accepted (engineering) |
| D-002 | 2026-11-14 | PR #5's engine code is a concept archive, not a base | Browser-local heuristics presented as intelligence; owner confirmed concepts are preserved, code is not carried | accepted (owner) |
| D-003 | 2026-11-14 | One modular application: Next.js, TypeScript, PostgreSQL on Supabase, RLS, Zod | Fits the product; continuity; owner-approved | accepted (owner) |
| D-004 | 2026-11-14 | Data model starts from PR #1's ideas (topics as rows, per-user memory, append-only events), redesigned | Supports non-repetition and behaviour-driven ranking | accepted (owner: use as reference) |
| D-005 | 2026-11-14 | No authentication bypass; demo mode removed | Directive rule; owner-approved | accepted (owner) |
| D-006 | 2026-11-14 | Canonical brand VSHARES; VSHARE = personal development experience; VAI = intelligence engine; one product | Owner decision | accepted (owner) |
| D-007 | 2026-11-14 | Brand: black and gold, white and silver type, blue secondary accent, dark only | Owner decision | accepted (owner) |
| D-008 | 2026-11-14 | MVP content is "value cards": curated external resources with original summaries, takeaways and attribution, plus moderated user submissions. No copying, hosting or scraping of third-party content | Owner direction on sources; makes a first learning win possible on-page without hosting others' work | accepted (owner direction; card format proposed) |
| D-009 | 2026-11-14 | MVP scope per master spec Part B; paths, quizzes, quests, gamification, applied log, LLM features, creators, payments deferred | Owner decision: validate value-curated scrolling with ~100 users first | accepted (owner) |
| D-010 | 2026-11-14 | Guests are Supabase anonymous users created on first write and upgraded in place | One code path and one set of RLS policies; no progress migration; private data stays per-user | proposed |
| D-011 | 2026-11-14 | Sign-in: magic link and Google only | Owner decision; no passwords to store | accepted (owner) |
| D-012 | 2026-11-14 | Database is reached only from the server; integrity-critical tables are server-write-only | RLS plus server checks; prevents forged progress and analytics | proposed |
| D-013 | 2026-11-14 | Ranker v1 is a deterministic weighted sum with logged component breakdowns; any replacement must beat it on logged outcomes | Transparent, testable, free; owner approved deterministic ranking | accepted (owner direction; formula proposed) |
| D-014 | 2026-11-14 | Feed sessions are finite and end with a closing card | "Not designed to keep you scrolling" | proposed |
| D-015 | 2026-11-14 | One `content_interactions` row per user and card holds open / complete / save / like / skip state; progress is derived from it | No counters to drift; one place for feed memory | proposed |
| D-016 | 2026-11-14 | First-party analytics in Postgres; no third-party analytics in the MVP | Privacy and simplicity at 100-user scale | proposed |
| D-017 | 2026-11-14 | Rate limiting uses a Postgres table | No extra service or cost at MVP scale; replaceable | proposed |
| D-018 | 2026-11-14 | No ORM; Supabase client with generated types and SQL migrations | RLS always applies; fewer dependencies | proposed |
| D-019 | 2026-11-14 | Dependencies pinned to exact versions; upgrades within majors now, major upgrades individually | Reproducible builds; controlled risk | accepted (engineering) |
| D-020 | 2026-11-14 | Accept one moderate, dev-only advisory (minimatch via typescript-eslint) until an upstream fix exists | Not in production; the offered fix is a major downgrade | accepted (engineering; visible in security doc) |
| D-021 | 2026-11-14 | Git history is not rewritten for SEC-2026-001; the historical file path is excluded in the gitleaks config | Owner instruction; keeps the scanner useful | accepted (owner) |
| D-022 | 2026-11-14 | The five-tab navigation ships in the MVP with only real content in each tab | Owner's navigation; avoids relearning later; no placeholder features | proposed |
| D-023 | 2026-11-14 | Reserved modules (`learning`, `creators`) are documented interfaces only — no code or tables until their release | "Document future interfaces without creating unnecessary infrastructure" | accepted (owner direction) |
| D-024 | 2026-11-14 | Speculative projection features from PR #5 (simulation, future-state, digital-twin forecasting) are unscheduled | They would present speculation as insight, contrary to the product rules; revisit only with evidence | proposed |
