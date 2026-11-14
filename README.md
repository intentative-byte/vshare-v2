# VSHARES

An AI-powered value discovery, learning and human capability platform.

> Stop doomscrolling. Start value scrolling.

VSHARES turns attention into knowledge you can use: short, genuinely useful things to learn, chosen for what you want to get better at, with progress that counts what you actually finished.

This repository is the 2.0 rebuild. It is being built milestone by milestone; see `docs/VSHARES_PROGRESS.md` for what is finished and what is not.

## Status

**Milestone 1 — foundation.** The application shell, design system, platform layer, security headers and test suites exist. There is no database, no account system and no catalogue yet: every navigation destination has a real route, and the ones that are not finished say so on the page.

## Stack

| Layer | Choice |
|---|---|
| Application | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS with design tokens |
| Database | PostgreSQL via Supabase, row-level security on every table |
| Authentication | Supabase Auth: magic link, Google, guest accounts (Milestone 2) |
| Validation | Zod at every boundary |
| Tests | Vitest, Playwright, axe, database policy tests |
| Intelligence | VAI — our own deterministic ranking; no model provider wired |

Rationale for each choice is in `docs/VSHARES_ARCHITECTURE.md`.

## Getting started

```bash
npm ci
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open http://localhost:3000. No database is needed for Milestone 1.

The component gallery is at `/dev/ui` outside production.

## Checks

```bash
npm run verify
```

That runs repository hygiene, lint, types, unit tests and a production build. End-to-end, accessibility and security-header suites run separately against a production build:

```bash
npm run test:e2e
```

On a machine with a preinstalled browser, point Playwright at it:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
```

## Local database (from Milestone 2)

```bash
npm run db:start
```

Copy the API URL and anon key it prints into `.env.local`, then apply migrations:

```bash
npm run db:reset
```

## Repository layout

```text
src/app/        routes: public home, the five tabs, API endpoints
src/modules/    one folder per domain, each with a documented public API
src/platform/   env, database clients, action pipeline, auth, rate limit, logging
src/components/ design-system primitives and the application shell
src/styles/     design tokens
supabase/       migrations and local configuration
tests/          unit and end-to-end suites
docs/           specification, architecture, security, roadmap, decisions
```

## Documentation

Start with `CLAUDE.md` for the engineering rules, then `docs/VSHARES_MASTER_SPEC.md` for the product and `docs/VSHARES_ARCHITECTURE.md` for the system.

## Licence

See `LICENSE`.
