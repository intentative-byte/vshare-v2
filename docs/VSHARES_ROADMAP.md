# VSHARES — Roadmap

Status key: `done` · `in progress` · `blocked` · `planned`

Scope below assumes the recommended defaults in `VSHARES_PROJECT_DISCOVERY.md` §9. It will be revised once the owner answers Q1–Q9.

| Phase | Goal | Exit criteria | Status |
|---|---|---|---|
| 0 Discovery | Understand what exists and what is intended. | Discovery document written; owner decisions listed. | **done** (awaiting answers) |
| 1 Architecture | Fix the stack, schema, API contracts and standards. | `VSHARES_PRODUCT_SPEC.md` and `VSHARES_ARCHITECTURE.md` approved; schema v1 and API contract reviewed; ADRs recorded. | blocked on Q1–Q6, Q9 |
| 2 Foundation | A clean, tested, reproducible skeleton. | New structure in place; pinned dependencies with zero high/critical audit findings; env validation; local Supabase with migrations; Vitest + Playwright running; CI green on lint, typecheck, test, build, audit, secret scan. | planned |
| 3 Design system | Reusable UI and app shell. | Tokens, primitives, form controls, loading/empty/error states, responsive nav; documented in `VSHARES_DESIGN_SYSTEM.md`; axe checks pass. | planned (needs Q2) |
| 4 Core product | One complete user journey. | Sign up → topics → ranked feed → save/like/skip/done → saved library → share resource → profile, export, delete account. Each step has validation, authorisation, tests and docs. | planned |
| 5 Integrations | Required third parties behind documented adapters. | Transactional email, OAuth providers, error tracking, rate-limit store — each either live-verified or clearly labelled mocked. | planned |
| 6 QA | Prove it works. | Unit, integration, RLS, E2E, accessibility and security review complete; `VSHARES_TEST_REPORT.md` and `VSHARES_SECURITY_REVIEW.md` published; no open critical defects. | planned |
| 7 Production prep | Ready to run, not yet deployed. | Deployment config, backups and restore drill, monitoring, runbook, release checklist. Deployment itself requires explicit authorisation. | planned |
| 8 Expansion | Evidence-led growth. | Candidate features (streaks, learning paths, creators, goals, assistant) prioritised from real usage. | planned |

## First five engineering tasks (once decisions land)

1. **Secret remediation and guardrail** — after owner rotates the Alpaca keys and approves removal (Q7): remove the trading script and its notes, add secret scanning to CI so it cannot recur.
2. **Product spec v1** — write `VSHARES_PRODUCT_SPEC.md`: personas, the MVP journey, per-feature requirements and acceptance criteria, explicit out-of-scope list.
3. **Architecture and data design** — write `VSHARES_ARCHITECTURE.md`: schema v1 (topics, content, interactions, memory, saved, reports), RLS matrix, feed-ranking query design, API contracts, threat model outline, ADRs in `VSHARES_DECISIONS.md`.
4. **Foundation build** — restructure to `src/`, pin dependencies and clear the audit, validated environment config, local Supabase workflow, Vitest + Playwright, GitHub Actions CI.
5. **Auth and API baseline** — remove the demo-cookie bypass, safe post-login redirects, validated request layer with uniform errors and rate limiting, RLS tests proving cross-user isolation.
