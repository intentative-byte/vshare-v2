# VSHARES — T7 authenticated editorial E2E (local Supabase)

- **What it is:** `tests/e2e/editorial-authenticated.spec.ts` — a repeatable
  Playwright suite that drives `/admin/editorial` against a **real local Supabase**
  stack (PostgREST + GoTrue), covering the nine T7 scenarios.
- **It never touches hosted Supabase, never bypasses the app's authorization, and
  never fabricates a decision.** It SKIPS cleanly unless the local stack is
  configured, so it cannot produce a false pass.

## Status in this environment: BLOCKED (skips)

This container has **no Docker, no Supabase CLI, and no PostgREST/GoTrue**, so the
local stack cannot run here and the suite **skips**. The server-side guarantees it
would assert are instead proven at the database layer by the local PostgreSQL
tests (see "What is verified without it" below). Nothing is faked.

## What it covers (nine scenarios)

1. Administrator can open the board (200).
2. Moderator can open the board (200).
3. Non-staff account is rejected (404).
4. A draft shows its current immutable revision (revision binding).
5. A moderator records a decision; it persists in the audit ledger (reload shows it).
6. High-impact content needs two **distinct** reviewers (A approves → not eligible;
   B approves → eligible).
7. The same reviewer cannot approve the same revision twice (duplicate rejection).
8. A superseded revision no longer establishes eligibility (stale decision).
9. Session expiry is handled without a false success (cookie dropped → 404).

## How to run it

Requires Docker. Explicit, labelled, local-only test identities are used
(`e2e-admin-a@vshares.local`, `e2e-moderator-b@vshares.local`,
`e2e-ordinary@vshares.local`).

```bash
# 1. Start a local Supabase stack (PostgREST + GoTrue + Postgres).
supabase start              # or an equivalent local stack

# 2. Apply the migrations and the batch-1 seed to the LOCAL db.
supabase db reset           # applies supabase/migrations + supabase/seed

# 3. Grant two DISTINCT staff identities (local only):
#    - create the three identities by signing each in once, then:
#    bootstrap e2e-admin-a@vshares.local      as admin
#    bootstrap e2e-moderator-b@vshares.local  as moderator
#    (use scripts/bootstrap-staff.mjs against the LOCAL direct connection,
#     or the Supabase Studio SQL editor — never the hosted project.)

# 4. Point the app and the test at the local stack and run:
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
export E2E_LOCAL_SUPABASE=1
export E2E_SUPABASE_URL=http://127.0.0.1:54321
export E2E_SUPABASE_SERVICE_KEY=<local service-role key>   # LOCAL only
npm run test:e2e -- editorial-authenticated.spec.ts
```

The `E2E_SUPABASE_SERVICE_KEY` is the **local** service key and is used only to
mint sessions for the labelled test identities via GoTrue's admin
`generate_link`; the app still verifies each session itself.

## What is verified WITHOUT the local stack (real PostgreSQL)

The nine scenarios' server-side rules are proven by the local DB test suite
(`npm run test:db`), which runs against real PostgreSQL 16:

| T7 scenario | Proven by |
|---|---|
| Non-staff rejection / RLS | `310_editorial_board_contract.sql`, `280_editorial_governance.sql` |
| Draft visibility + immutable revision | `310`, `300_factory_bridge_draft_only.sql` |
| Record a decision / audit persistence | `280` (append-only ledger, hash chain) |
| Two distinct reviewers (quorum) | `280` (distinct approvers; duplicate refused) |
| Duplicate rejection | `280`, `300` |
| Stale/superseded revision | `280` (new revision invalidates prior approvals) |
| Publication stays locked | `300` (unchecked-link/self-approval refused) |

The Playwright suite adds the **browser + real-auth** layer on top of these
server-side guarantees; it is the one piece that needs the local stack to execute.
