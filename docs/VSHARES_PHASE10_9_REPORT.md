# VSHARES — Phase 10.9 report: Editorial Governance, Identity & Audit

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- The Editorial Review Workbench is prepared for **authenticated** human
  decisions, **independent** second reviews and a **tamper-evident** decision
  history — with every live control kept closed. **No remote database write, no
  migration push, no automatic approval, no content publication, no RLS
  weakening, no deployment or merge, no secret exposure.**

## What this phase did and did not do

- **Did:** design the governance model, add an additive migration and local DB
  tests, build the authenticated server action, and relabel the prototype so no
  one mistakes a local simulation for an authoritative decision.
- **Did not:** apply the migration to any remote project, activate the
  authenticated path in the UI, approve or publish anything, or change any
  existing RLS. The migration exists only locally and is exercised only by the
  local test harness.

## Task 1 — security review & trust boundaries
`docs/VSHARES_EDITORIAL_GOVERNANCE.md` §1. The database is the boundary: who may
decide, who the reviewer is, when it happened, whether it may publish, and
whether a row can change are all enforced in PostgreSQL, not only above it. The
browser, a typed name, client timestamps, client eligibility and the agent are
explicitly untrusted. Publication is not part of this system.

## Task 2 — authenticated reviewer identity
The reviewer is always `app.current_user_id()`, set inside
`record_editorial_decision`; it is never a parameter. Non-staff and anonymous
callers are refused. The workbench's typed "reviewer name" is now labelled a
**simulation input** and is never sent to the authenticated path. Governance doc §2.

## Task 3 — independent second review
Two **distinct** authorised reviewers are required to approve the same current
revision of high-impact content; the same account cannot supply both approvals
(a duplicate approval is refused). Decisions bind to an **immutable** revision, so
a substantive change (a new `content_versions` row becomes current) automatically
invalidates prior approvals. Governance doc §3.

## Task 4 — append-only, hash-chained ledger
`editorial_decisions` is append-only (no write policy/grant; a trigger blocks
UPDATE/DELETE) and each row carries `sha256(prev_hash || canonical fields)`.
`editorial_ledger_valid()` detects any later edit. The **limitations are stated
honestly** (governance doc §4): this is tamper-*evident*, not tamper-*proof* — a
database superuser who also recomputes the chain can still rewrite history, there
is no external anchoring, and the privileged-admin risk is mitigated
operationally (least privilege, no routine service-role use), not
cryptographically.

## Task 5 — additive migration + local DB tests
`supabase/migrations/20261119120000_editorial_governance.sql` (new table, enum,
three SECURITY DEFINER functions, append-only trigger, least-privilege RLS,
indexes). `supabase/tests/cases/280_editorial_governance.sql` proves the rules.
**Local testing only; not applied remotely.**

## Task 6 — authorised server action
`content.recordEditorialDecision` (`src/modules/content/admin-actions.ts`),
`access: "moderator"`, through the existing pipeline (rate-limit → authenticate →
validate → authorise → execute → record). Input carries **no** reviewer identity,
timestamp or eligibility — the database sets all three. Publication stays separate
(`moderate_content`). Repository calls:
`callRecordEditorialDecision`, `getEditorialPublicationEligible`,
`getEditorialLedgerValid`.

## Task 7 — workbench honesty
`src/components/editorial/editorial-workbench.tsx` now labels local decisions as a
**simulation** saved in the browser only — not authenticated, not persisted, not
authoritative — and names the authenticated server path as built but **not yet
activated**. A typed name is marked as not an identity.

## Task 8 — verification (exact)
| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 319 passed, 4 skipped** (gated live tests) |
| `npm run test:db` | **PASS — 28 files, 469 assertions, 0 failed** (incl. 12 new governance assertions) |
| `npm run test:e2e` | **PASS — 94 passed / 72 skipped / 0 failed** (incl. editorial access-denial 404s) |
| `npm run build` | **PASS — compiled successfully** |
| `npm run check:hygiene` | **PASS — 387 tracked files** |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| Dev gallery accessibility (axe) | **0 violations** on `/dev/editorial` at 412px and 1280px |

The 12 governance assertions cover: staff-only recording; non-staff refused;
append-only UPDATE and DELETE refused; revision binding (a revision must belong to
the content); duplicate-approval refusal; one-approval eligibility for ordinary
content; two-distinct-reviewer eligibility for high-impact; revision invalidation;
hash-chain validity for genuine data; **forced-tamper detection**; direct client
insert refused.

## Task 9 — delivery & owner-controlled activation
Governance doc §6 is the step-by-step, owner-gated activation procedure (review →
apply to dev exactly as migration 9 → grant two distinct reviewers → activate the
authenticated workbench form in a later change → keep publication separate →
promote to production on owner approval), with an additive-migration rollback.

## Restrictions honoured
No remote database write · no migration push · no automatic approval · no content
publication · no RLS weakening · no deployment or merge · no secret exposure.

**STOP for owner review.**
