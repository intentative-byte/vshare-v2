# VSHARES — Release Plan (MVP)

- Version: 0.1 (plan; nothing is deployed) · Date: 2026-11-14
- No deployment, paid service or production operation happens without explicit owner authorisation.

## 1. Release objective

Put the MVP in front of roughly 100 invited users and measure the validation targets in the master spec §B1.

## 2. Current state of environments

| Environment | State | Evidence |
|---|---|---|
| Local development | Works for the legacy app without a database | Build verified 2026-11-14 |
| Local Supabase | Not yet set up for the rebuild | Planned in M1 |
| Hosted Supabase project | **Unknown** | No credentials or project reference in the repository or this environment |
| Render deployment | **Unknown** | `render.yaml` exists; whether a service was ever created from it cannot be checked from here |
| Lovable beta | Historical reference only. Not used for hosting, deployment or any production function (permanent owner decision) | — |

The plan assumes no production environment exists. If one does, it is inventoried before anything is changed, and existing data is neither migrated nor deleted without approval.

## 3. Environments to establish

| Environment | Purpose | Data | Who can access |
|---|---|---|---|
| Local | Development and automated tests | Seed data only | Developers |
| CI | Every push: tests against an ephemeral local Supabase | Fixtures | Automated |
| Preview | Owner review of milestones | Seed data; no real users | Owner, invited reviewers |
| Production | The pilot | Real users | Public by invitation |

Preview and production are separate Supabase projects with separate keys. Secrets live only in the hosting provider's and GitHub's secret stores.

## 4. Decisions and approvals needed before release

| Item | Options | Cost note |
|---|---|---|
| Hosting | To be selected and approved separately. Candidates: Render (existing blueprint), Vercel, or any Node/container host — the build is host-agnostic. Lovable is excluded | Free tiers sleep or carry usage limits; a paid tier is advisable for a pilot |
| Supabase plan | Free or Pro | Free has no point-in-time recovery, limited backups and pauses inactive projects — not recommended for real user data |
| Supabase region | London or an EU region | — |
| Email delivery for magic links | A transactional email provider with a verified sending domain | Supabase's built-in sender is rate-limited and for testing only |
| Domain | Owner to provide | Registration cost |
| Google OAuth client | Owner creates in Google Cloud | Free |
| CAPTCHA for guest sign-in | Provider choice | Free tiers exist |
| Error tracking and uptime monitoring | Optional third-party services | Free tiers exist |

Exact prices are not quoted here because they were not verified in this session; an itemised, checked cost sheet will be presented for approval in M8.

## 5. Release gates

All must be true, and recorded in `VSHARES_TEST_REPORT.md`:

1. Every MVP acceptance criterion (spec §B5) has a passing automated test.
2. CI green on the release commit: lint, typecheck, unit, database, integration, E2E, accessibility, audit, secret scan.
3. Security: ASVS L2 walk-through complete; no open critical or high findings.
3a. **Release blocker:** the eight live authentication tests pass against a real auth service. Procedure in `VSHARES_VERIFICATION_PROCEDURE.md`. Until then authentication is implemented, not verified.
3b. **Release blocker:** every published card has a recorded successful link check. Enforced by the database, so it cannot be skipped.
4. Privacy: privacy notice and terms approved by the owner; consent behaviour verified; export and deletion verified on the preview environment.
5. Content: launch catalogue reviewed and approved by the owner; every link checked within 7 days of launch.
6. Operations: backups enabled and one restore drill performed; health and readiness checks monitored; runbook written; first admin account bootstrapped.
7. Performance budget met on a mid-range mobile profile for the home and first-card pages (targets set in M1 and measured, not assumed).
8. Owner go/no-go recorded.

## 6. Rollout

1. Deploy to preview; owner walkthrough using the first-user test script.
2. Deploy to production behind an invite flag; internal smoke test.
3. Invite the first 10 users; watch errors and the first-session funnel for 48 hours.
4. Fix, then invite the rest in batches.
5. Weekly validation review against the spec targets.

## 7. Rollback

- Application: redeploy the previous build (kept by the host).
- Database: migrations are forward-only and additive during the pilot; a destructive migration requires a backup taken immediately before and owner approval.
- Feature flags switch off submission, guest accounts or analytics independently if any misbehaves.

## 8. After release

Incident process, weekly dependency updates, and a decision point at the end of the pilot: proceed to R2, iterate on the MVP, or stop.
