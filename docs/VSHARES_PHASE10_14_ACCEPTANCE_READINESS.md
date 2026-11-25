# VSHARES — Phase 10.14: Editorial Acceptance Readiness

- **Date:** 2026-11-21 · **Branch:** `claude/gallant-mendel-xey567`
- Read-only diagnostics + instructions. **No hosted writes, no migrations, no
  deployment, no publication, no role/RLS change, no secrets printed.**
- Two environments are kept distinct throughout:
  - **Claude env** = this cloud container (what I can run here).
  - **Owner machine** = the owner's Windows computer with the dev Supabase config.

## 1. Environment readiness

Values are never printed — only presence/shape.

| Requirement | Claude env | Owner machine (expected) | Where set |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **set** (→ `apgchptregdpswiwmyua`) | must be set | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **EMPTY** | **must be set** (dev "anon public" key) | `.env.local` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | should be the URL the app is opened at | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | EMPTY | only for local setup scripts; **not needed for review** | shell only, never committed |
| Next.js startup | `npm ci && npm run build && npx next start` (or `npm run dev`) | same | — |
| Auth callback route | `src/app/auth/callback/route.ts` → `exchangeCodeForSession` | same | code |
| Redirect target of a magic link | `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=…` | same | `src/platform/auth/provider.ts` (`redirectUrl`) |
| Admin role detection | `getViewer()` reads `public.user_roles`; staff = `moderator`∪`admin` | same | `src/platform/auth/provider.ts`, `app.is_staff()` |
| Editorial route protection | `src/app/admin/layout.tsx`: `notFound()` if DB unconfigured **or** viewer not staff | same | code |

**Key fact:** the whole authenticated app is gated by `isDatabaseConfigured()`
(URL **and** anon key). In the **Claude env the anon key is empty**, so
`/admin/editorial` returns 404 here *by configuration* — this is NOT the owner's
bug. On the owner machine the anon key should be present.

## 2. Authentication diagnostics — the `/admin/editorial` 404 and magic-link issue

The admin layout returns **404 (`notFound`), never 403**, so a 404 has several
distinct causes. Ranked, with how to tell them apart:

| Cause | Symptom | How to confirm | Fix (owner, safe) |
|---|---|---|---|
| **A. Missing env config** (anon key) | Every `/admin/*` is 404 even when signed in; `/sign-in` may also misbehave | `.env.local` has an empty `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Paste the dev **anon public** key into `.env.local`, restart the app |
| **B. No authenticated session** | `/admin/editorial` 404 while signed out; `/you` redirects to sign-in | Visit `/you` — if it sends you to `/sign-in`, there is no session | Complete a magic-link sign-in (see below) |
| **C. Missing staff role** | Signed in (e.g. `/you` works) but `/admin/editorial` still 404 | The account has no `moderator`/`admin` row in `user_roles` | Bootstrap the role (owner, §3) |
| **D. Redirect-URL mismatch** | The magic link opens but bounces to `/sign-in?error=callback` | The link's host ≠ `NEXT_PUBLIC_SITE_URL`, or that URL isn't allow-listed in Supabase | Align Site URL + add it to Supabase redirect allowlist (§3) |
| **E. Magic-link rate limit (429)** | "Too many attempts. Please try again shortly." | GoTrue returned 429 (the app maps it to that message) | Wait out the window; or raise Auth rate limits in the Supabase dashboard |
| **F. App routing** | — | **Ruled out:** `/admin/editorial` builds and is gated only by the layout; the route itself is correct | n/a |

**Most likely, in order, on the owner machine:** C (no staff role yet) → B (not
signed in) → D (redirect URL) → E (rate limit). **A** is the cause only in the
Claude env. **F is ruled out** — the route and gate are correct (proven by the
build and the DB contract test `310`).

The app never bypasses any of this: the fix is always *configuration or a granted
role*, never a code change that weakens the gate.

## 3. Exact, safe Windows Git Bash instructions

Run in **Git Bash** on the owner machine, from the repo root. These change only
**local config** and **grant a role** (an owner action); they make **no hosted
schema change** and **no publication**.

```bash
# 0. Pull the latest branch.
git fetch origin && git checkout claude/gallant-mendel-xey567 && git pull --ff-only

# 1. Configure the app (fixes cause A). Edit .env.local and set:
#    NEXT_PUBLIC_SUPABASE_URL=https://apgchptregdpswiwmyua.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon public key>   # Settings -> API
#    NEXT_PUBLIC_SITE_URL=http://localhost:3000
#    (Do NOT put the service-role key in .env.local.)

# 2. In the Supabase dashboard (Auth -> URL Configuration), fix cause D:
#    - Site URL:      http://localhost:3000
#    - Redirect URLs: add  http://localhost:3000/**  (or at least
#                          http://localhost:3000/auth/callback)

# 3. Start the app.
npm ci
npm run dev            # http://localhost:3000

# 4. Sign in (fixes cause B): open http://localhost:3000/sign-in, request a magic
#    link for the admin email, open the link from the inbox. If you hit cause E
#    (429), wait a minute between attempts.

# 5. Grant the staff role (fixes cause C) — ONE account, admin. The account must
#    have signed in at least once so it exists in auth.users. Run in the Supabase
#    SQL editor (owner action; no schema change), replacing the email:
#      do $$ declare v uuid; begin
#        select id into v from auth.users where email='you@example.com';
#        if v is null then raise exception 'sign in once first'; end if;
#        insert into public.user_roles(user_id, role) values (v,'admin')
#          on conflict do nothing;
#      end $$;
#    (Or, with the LOCAL/dev direct connection string, use the shipped tool:
#      DATABASE_URL="<dev direct connection>" \
#        node scripts/bootstrap-staff.mjs you@example.com admin )

# 6. Grant a SECOND, distinct staff account as moderator (needed for the
#    two-reviewer high-impact rule) — repeat step 4 for a second email, then
#    step 5 with role 'moderator'.

# 7. Re-open http://localhost:3000/admin/editorial — it should now render the
#    batch-1 draft board for the signed-in admin.
```

Nothing above publishes content, changes RLS, or alters the hosted schema.

## 4. Read-only hosted development acceptance checklist

All items are **read-only** (no record creation, no decisions). Tick each in the
browser as the signed-in admin/moderator, or via read-only SQL in the dashboard.

- [ ] **Admin sign-in** — admin can reach `/admin/editorial` (200).
- [ ] **Moderator sign-in** — a distinct moderator can reach `/admin/editorial` (200).
- [ ] **Staff-only access** — a non-staff account gets 404 at `/admin/editorial`.
- [ ] **Batch-1 inventory** — the board lists the 10 seeded drafts (if the seed was
      applied on dev; confirm with read-only SQL: `select count(*) from
      content_items where status='draft';` — expect 10, else the seed isn't present).
- [ ] **Revision visibility** — each item shows a current revision id.
- [ ] **Evidence status** — each item shows "source link not checked → not verified"
      (none shown as verified/publication-ready).
- [ ] **Audit ledger visibility** — the ledger section renders (empty until any
      decision is recorded) and is staff-only.
- [ ] **High-impact requirements** — the 3 high-impact cards (budget, sleep, scams)
      state that two distinct reviewers are required.

**Held for SEPARATE owner approval (these are hosted WRITES, not in this phase):**
recording any editorial decision, approving, the two-reviewer quorum *exercise*,
duplicate/stale *attempts*, and anything that creates rows. Those are the
`VSHARES_PHASE10_11A` acceptance-plan tests 5–10.

## 5. Local E2E readiness (the nine Playwright scenarios)

`tests/e2e/editorial-authenticated.spec.ts` covers all nine scenarios and **skips**
until a local Supabase stack is configured (it is not available in the Claude env —
no Docker/CLI/PostgREST/GoTrue). **Skipped is reported as skipped, never passed.**

To execute on the owner machine (Windows + Docker Desktop):

```bash
# 1. Install Docker Desktop and the Supabase CLI.
# 2. From the repo root, start a LOCAL stack and apply migrations + seed:
supabase start
supabase db reset        # applies supabase/migrations + supabase/seed (batch-1)

# 3. Grant two distinct local staff identities (local only):
#    bootstrap  e2e-admin-a@vshares.local      admin
#    bootstrap  e2e-moderator-b@vshares.local  moderator
#    (sign each in once via the local Inbucket mailbox, then bootstrap-staff.mjs
#     against the LOCAL direct connection — never the hosted project.)

# 4. Point the app + test at the local stack and run just this suite:
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
export E2E_LOCAL_SUPABASE=1
export E2E_SUPABASE_URL=http://127.0.0.1:54321
export E2E_SUPABASE_SERVICE_KEY=<local service-role key>   # LOCAL only
npm run test:e2e -- editorial-authenticated.spec.ts
```

Full detail: `docs/VSHARES_T7_LOCAL_EDITORIAL_E2E.md`. These nine scenarios' server
rules are already proven on real PostgreSQL by DB cases `280`/`300`/`310`.

## 6. Quality gates (this phase, exact)

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 382 passed, 5 skipped** |
| `npm run test:db` (real local PostgreSQL) | **PASS — 31 files, 497 assertions, 0 failed** |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 424 tracked files** |
| (`npm run test:e2e`) | 94 passed / 90 skipped — the 9 auth tests skip (no local stack) |

## 7. Acceptance-readiness matrix

| # | Item | State | Owner action needed | Hosted write? | Separate approval? |
|---|---|---|---|---|---|
| 1 | App builds, routes, gate correct | **Verified** (build, DB `310`) | none | no | no |
| 2 | Governance (quorum, duplicate, revision, append-only, draft-only) | **Verified** on real PG (`280`/`300`/`310`) | none | no | no |
| 3 | Batch-1 is draft, sourced, not-verified, not publishable | **Verified** (local scratch over the seed) | none | no | no |
| 4 | `/admin/editorial` renders for a real admin | **Blocked here** (no anon key) | §3 steps 1–7 | no | no |
| 5 | Anon key present | **Blocked (Claude env)** / owner-set | add to `.env.local` | no | no |
| 6 | Two distinct staff accounts | **Blocked** | bootstrap admin + moderator (§3) | no (role grant only) | no |
| 7 | Magic-link sign-in working | **Blocked** (rate limit / redirect URL) | §3 steps 2 & 4 | no | no |
| 8 | Read-only hosted acceptance checklist (§4) | **Ready to run** once 4–7 done | run §4 | no | no |
| 9 | Hosted editorial decisions (quorum/duplicate/stale exercise) | **Held** | — | **yes** | **yes** |
| 10 | Local T7 Playwright suite | **Ready, skipped** | Docker + local Supabase (§5) | no | no |
| 11 | Batch-2 content | **Not review-eligible** (T4b) | human evidence pass (T4c) | no | no |

### 7.1 What is verified
App correctness, the full editorial governance on real PostgreSQL, and that
batch-1 is honest draft content (sourced, unverified, not publishable).

### 7.2 What remains blocked
Any *browser* verification against hosted dev — all of it hinges on the anon key,
two granted staff accounts, and a working magic-link sign-in on the owner machine.

### 7.3 What the owner must do on Windows
§3 steps 1–7 (set the anon key, fix the Supabase redirect URLs, sign in, bootstrap
an admin and a distinct moderator). Optionally §5 for the local E2E.

### 7.4 What can be tested without hosted writes
Everything in §4 (read-only): sign-ins, staff-only access, batch-1 inventory,
revision visibility, evidence status, ledger visibility, high-impact requirements.

### 7.5 What requires separate approval
Any hosted **write** — recording editorial decisions and exercising the quorum /
duplicate / stale rules on hosted dev (acceptance-plan tests 5–10 in
`VSHARES_PHASE10_11A_HOSTED_READINESS.md`). And, later, publication.

### 7.6 Recommended next development step
Owner completes §3 (anon key + two staff + sign-in) and runs the **§4 read-only
checklist** on hosted dev. Once that passes, request approval for the **hosted
write acceptance** (decisions/quorum) on batch-1. In parallel, **T4c** (human-led
batch-2 evidence recovery) remains the content track. No code change is required to
unblock acceptance — it is configuration and a role grant.
