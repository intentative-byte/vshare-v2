# VSHARES rebuild — engineering instructions

VSHARES is an AI-powered value discovery, learning, knowledge-sharing and human capability platform: "Stop doomscrolling. Start value scrolling." The MVP validates value-curated scrolling with ~100 users.

## Project identity (permanent owner decisions)

- VSHARES 2.0 is a fresh, independent project built directly in this GitHub repository with Claude Code.
- **No Lovable.** Do not use Lovable for generation, backend, hosting or deployment, and do not add Lovable SDKs, dependencies, integrations or deployment configuration. The earlier Lovable version is historical product reference only.
- **No trading.** VSHARES is completely separate from all DAX / trading / brokerage projects. Never import or reuse trading-bot logic, never connect to brokerage APIs (Alpaca, OANDA, Kraken or any other), and never share environment variables, secrets or infrastructure with another project. If such material appears in this repository, stop and report it.
- Approved stack: Next.js, React, TypeScript, Tailwind CSS, Next.js server architecture, PostgreSQL via Supabase, Supabase Auth, Vitest, Playwright, database security tests. Deployment platform is undecided — keep the build host-agnostic.
- All application logic stays in this repository. Supabase is infrastructure behind our own interfaces (`src/platform`); see architecture §9 for the portability rules.
 Read `docs/VSHARES_PROGRESS.md` first for the current phase, blockers and pending owner decisions.

## Documents (`docs/`)

| File | Use it for |
|---|---|
| `VSHARES_MASTER_SPEC.md` | Vision (Part A) and MVP scope with acceptance criteria (Part B) |
| `VSHARES_FEATURE_REGISTER.md` | Every feature: evidence, priority, status, target release |
| `VSHARES_ARCHITECTURE.md` | Modules, request pipeline, auth design, feed ranking spec |
| `VSHARES_DATA_MODEL.md` | Tables, policies, functions, retention |
| `VSHARES_API_CONTRACTS.md` | Server actions and route handlers |
| `VSHARES_DESIGN_SYSTEM.md` | Tokens, components, navigation, voice, accessibility |
| `VSHARES_SECURITY.md` | Threat model, incident record, privacy, dependency status |
| `VSHARES_ROADMAP.md` | Phases, MVP milestones M1–M8 and exit criteria |
| `VSHARES_RELEASE_PLAN.md` | Environments, gates, rollout |
| `VSHARES_TEST_REPORT.md` | Only results that were actually produced |
| `VSHARES_DECISIONS.md` | Decision log — add an entry for every architectural choice |
| `VSHARES_PROGRESS.md` | Running log — update at the end of every session |
| `VSHARES_PR_DISPOSITION.md`, `VSHARES_PROJECT_DISCOVERY.md` | Historical audit |

## Commands

```bash
npm ci
npm run lint
npm run typecheck
npm run check:hygiene # no foreign files, forbidden packages or unpinned deps
npm run test:smoke   # legacy copy-grep only; replaced in M1
npm run build
npm audit --omit=dev # must report 0
```

## Rules

- Build only what the current milestone in the roadmap calls for. MVP scope is spec Part B; everything else is roadmap. Reserved modules get no code or tables early.
- One modular application. Modules import each other only through `index.ts`; only `repository.ts` touches the database; the browser never does. No Supabase imports outside `src/platform` and `repository.ts` files; RLS policies use our SQL helpers, not vendor functions.
- Every mutation goes through the platform action pipeline: rate limit → authenticate → validate (Zod, strict) → authorise → execute → record → uniform result.
- Every table has RLS and a test proving cross-user isolation. Integrity-critical tables are server-write-only.
- No authentication bypass of any kind, including for demos or tests.
- No secrets in the repository. Never print, copy or transmit credential values, including the historical leak (SEC-2026-001).
- No fabricated functionality, content or metrics. Catalogue items are real, attributed, link-checked resources. Scores must be computed from recorded data and explainable.
- No engagement manipulation: finite feed sessions, no guilt or urgency copy, no streak pressure.
- Pin dependency versions; justify each new dependency in the decision log.
- Report status precisely: implemented, tested, mocked, blocked, production-verified. Never claim a check passed without running it.
- End each milestone with a VSHARES ENGINEERING REPORT (format in the owner's directive) and update the progress log, test report and feature register.
- Ask the owner before: deleting existing material, closing PRs or deleting branches, destructive database changes, anything that costs money, deploying, touching production data, rewriting git history or force-pushing.

## Hazards

- Legacy application code (`app/`, `components/`, `lib/`, `middleware.ts`) is scheduled for replacement in M1. It still contains a cookie-based auth bypass; do not reuse its patterns.
- Branch `cursor/optional-supabase-demo-791a` (PR #5) is a concept archive of browser-local heuristics. Do not port code from it.
- Git history on `main` contains a misplaced trading script with (now revoked) third-party credentials in commit `5db2911`. Do not reproduce, restore or reference its contents. History is not to be rewritten without owner approval.
