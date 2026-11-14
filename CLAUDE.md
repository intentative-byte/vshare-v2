# VSHARES rebuild — engineering instructions

VShare is a personalised learning-feed platform (topics → ranked feed → memory of what was seen → sharing). It is being rebuilt in controlled phases. Read `docs/VSHARES_PROGRESS.md` first to see the current phase and blockers.

## Project documents (`docs/`)

- `VSHARES_PROJECT_DISCOVERY.md` — what exists, defects, open owner decisions
- `VSHARES_ROADMAP.md` — phases and exit criteria
- `VSHARES_PROGRESS.md` — running log; update at the end of every working session
- `VSHARES_DECISIONS.md` — decision log; add an entry for any architectural choice
- Created in later phases: `VSHARES_PRODUCT_SPEC.md`, `VSHARES_ARCHITECTURE.md`, `VSHARES_DESIGN_SYSTEM.md`, `VSHARES_TEST_REPORT.md`, `VSHARES_SECURITY_REVIEW.md`

## Commands

```bash
npm ci
npm run lint
npm run typecheck
npm run test:smoke   # legacy copy-grep only; not a behavioural test
npm run build
```

## Rules

- Do not write application code for a phase until the previous phase's exit criteria in the roadmap are met and required owner decisions are recorded.
- Never commit secrets. Configuration comes from environment variables; `.env.example` holds names only.
- Never bypass authentication or authorisation, including for demos. Authorisation is enforced server-side and by Postgres RLS; every new table gets RLS and a test proving cross-user isolation.
- Validate all external input with a schema at the boundary. Never return raw database errors to clients. Never log personal data.
- Pin dependency versions; do not use `latest`. Add a dependency only when it clearly earns its place.
- A feature is done only when requirements are documented, it works end to end, tests pass, errors are handled, and docs are updated.
- Report status using these words precisely: implemented, tested, mocked, blocked, production-verified. Never claim a check passed without having run it.
- Ask the owner before: deleting existing material, destructive database changes, anything that costs money, deploying, touching production data, rewriting git history.

## Known hazards in the legacy code

- `DAX_GOLD_PLUS_v7_LEARNING_READY.py` and `CLEANUP_NOTES.md` are unrelated to VShare and the script contains leaked credentials. Do not copy from, run, or extend them; removal awaits owner approval.
- The branch `cursor/optional-supabase-demo-791a` is an idea archive of mock heuristics. Do not port code from it.
- Legacy `main` has an open redirect in `app/auth/callback/route.ts` and a cookie-based auth bypass in `middleware.ts`; neither pattern may be reused.
