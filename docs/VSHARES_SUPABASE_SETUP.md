# VSHARES — Connecting a development Supabase project

- Date: 2026-11-15 · Live Integration and Verification stage
- Purpose: stand up a dedicated development environment so the 72 blocked
  live-service checks can run. This is the **first** deliverable of the live
  integration stage, and the one owner action (creating the project) that
  unblocks most verification.
- Cost: nothing. The free tier is enough for all of this.

**Never paste a secret into a chat, an issue or a commit.** Everything the
application needs at runtime uses the publishable (anon) key, which is designed
to be seen by browsers. The service-role key and the database password are
needed only for the one-off setup commands you run yourself on your own
machine — they are never sent here and never committed.

> **Readiness evidence.** The steps below are not theoretical. The schema and
> seeds have been applied to a Supabase-shaped PostgreSQL database (real
> `auth.users`, the `anon`/`authenticated`/`service_role` roles, no test
> harness) and verified: all seven migrations and both seed files apply
> cleanly; inserting into `auth.users` fires the signup trigger and creates a
> profile and preferences; the ten cards load as drafts that cannot publish;
> and reads as `authenticated` respect row-level security. So the application
> is ready to connect — what remains is a real project with the HTTP auth and
> data services, which only you can create.

---

## Part A — what you do (about 15 minutes)

### 1. Create the project

1. Sign in at supabase.com and create a new project.
2. Name it so nobody mistakes it for production — `vshares-dev` is good.
3. Choose a **London (eu-west-2)** or EU region. VSHARES launches in the UK and
   the data model assumes a UK/EU region.
4. Set a database password when prompted and keep it in your password manager.
   You need it only for Part B step 2 (applying the schema from your machine).

### 2. Configure authentication

Dashboard → **Authentication → Providers / Settings**:

- **Email**: enabled. Turn **off** "Enable password sign-in" — VSHARES has no
  passwords; sign-in is a magic link (D-011).
- **Confirm email**: enabled (the default). A magic link is the confirmation.
- **Anonymous sign-ins**: **enabled**. This is what lets someone learn before
  registering; without it, guest accounts and the first learning win do not
  work.
- **Google**: leave **disabled** for now. See step 7 — it is not needed to run
  the blocked tests.

### 3. Magic-link redirects

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs** (add all three, so both dev ports and the e2e port work):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3100/auth/callback`  ← the port the e2e suite uses
  - `http://localhost:3106/auth/callback`  ← the port used for screenshots

These must match exactly, or a magic link will refuse to complete sign-in. The
callback route itself is already built and uses the tested redirect sanitiser.

### 4. Required environment variables

Create `.env.local` in the project root (it is git-ignored):

```bash
# Runtime — safe to share, used by the browser. From Settings → API.
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon / public key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-only, for privileged setup/verification scripts. NEVER sent here,
# NEVER committed. From Settings → API (service_role) — keep it local.
SUPABASE_SERVICE_ROLE_KEY=<the service_role key>
```

| Variable | What it is | Shared? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The project URL | Yes, public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable key | Yes, public by design |
| `NEXT_PUBLIC_SITE_URL` | Where the app runs | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key for setup scripts | **No — local only** |

The app validates these at startup (`src/platform/env.ts`); a missing or
malformed value produces a clear error rather than a broken page.

### 5. The two values to send me

To run the live tests I need only the two **public** values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both are safe: the anon key is public by design and every table is protected by
row-level security (395 database assertions prove it). **Do not send the
`service_role` key or the database password.**

---

## Part B — applying the schema (you run these once, on your machine)

These need the **direct Postgres connection string** (Dashboard → Settings →
Database → Connection string → URI) or the service-role key. Run them yourself;
they are not sent here.

### 6. Database migrations

Two routes. Either works; the first tracks state, the second needs no CLI.

**Route A — Supabase CLI (recommended, tracks applied migrations):**

```bash
supabase link --project-ref <your-project-ref>
```
```bash
supabase db push
```

**Route B — one-shot, no CLI (uses the repo's apply script):**

```bash
DATABASE_URL="<direct connection string>" npm run apply:project -- --confirm --seed
```

This applies the seven migrations in order, then (with `--seed`) the taxonomy
and the ten draft cards. It **refuses** to run against a local test database,
and it never applies the test harness or test-only grants — those stand in for
what Supabase already provides. Add `--dry-run` first to see the plan.

> The migrations create the `on_auth_user_created` trigger on `auth.users`
> (in `20261114130000_identity.sql`), so signup automatically creates a profile
> and preferences on the real project — verified on the Supabase-shaped dry run.

### 7. Google OAuth prerequisites (optional, deferred)

Google sign-in (F-005) is **not required** to clear the blocked tests and is
not built yet. When you want it:

1. In Google Cloud Console, create an OAuth 2.0 Client ID (type: Web
   application).
2. Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase → Authentication → Providers → Google: enable it and paste the
   client ID and secret.
4. Tell me, and I will wire the "Continue with Google" button and add a live
   test for it. Until then, magic link is the only sign-in, by decision.

### 8. Development catalogue seeding

Covered by `--seed` in step 6, or run directly:

```bash
DATABASE_URL="<direct connection string>" \
  psql "$DATABASE_URL" -f supabase/seed/010_taxonomy.sql
DATABASE_URL="<direct connection string>" \
  psql "$DATABASE_URL" -f supabase/seed/020_cards_batch_1.sql
```

The seeds are **idempotent** — safe to re-run. They load 8 categories, 40
topics and 10 cards, all as **drafts** (0 published), because no link has been
checked yet. Nothing can be published until step 10.

### 9. Staff account bootstrap

First **sign in once** through the app with a magic link, so the auth service
creates your account. Then grant yourself the admin role:

```bash
DATABASE_URL="<direct connection string>" \
  npm run bootstrap:staff -- you@example.com admin
```

This looks the account up by email (failing loudly on a typo), grants the role,
and is idempotent. After this, roles are granted in-app by an admin through the
audited `grant_role` function — this script is only for the first one. It gives
you `/admin`: the moderation queue, the catalogue and taxonomy manager, the
measurement dashboard, and the audit log.

### 10. Secure credential configuration

- The anon key lives in `.env.local` (git-ignored) and is injected into the
  browser bundle at build — that is correct and safe.
- The service-role key lives only in your shell for the setup scripts above.
  It is never in `.env.local` that gets committed, never in the browser, never
  here. If you put it in `.env.local` for convenience, confirm `.env.local` is
  git-ignored (it is) and never commit it.
- No credential is ever printed by the scripts; they print role names and
  counts only.

---

## Part C — what I do once the two public values exist

```bash
# 1. Source links — ONLY from an environment with outbound network access.
DATABASE_URL="<direct connection string>" npm run check:links
```

Checks all ten source links against the live web and records each result.
**This is technical reachability only — it is not editorial review** (§4 of the
directive). A card needs both a passing link check and your editorial sign-off
before it is published, and the two are kept separate.

```bash
# 2. The 72 blocked live journeys, against the real services.
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run test:e2e
```

Runs authentication, guest upgrade, catalogue, feed, first learning win, saved
library, PATH, progress, submissions, moderation, export, deletion, analytics
and the admin interface against the live project. I report exactly what passed
and what did not, fix underlying causes, and re-run — **never removing or
weakening a test to turn the number green** (D-037).

```bash
# 3. The database policies, against the project, to confirm identical behaviour.
DATABASE_URL="<direct connection string>" npm run test:db
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| App shows "unavailable" state | `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` not set | Put both in `.env.local`, restart the dev server |
| Magic link opens but sign-in fails | Redirect URL mismatch | The exact callback URL (step 3) must be in the Redirect URLs list, port included |
| Magic-link email never arrives | Supabase's built-in email is rate-limited/sandboxed | Use the dashboard's **Authentication → Users** to find the magic link, or configure a dev SMTP; for local, the stack's Inbucket catches mail |
| `apply:project` refuses to run | `DATABASE_URL` points at a local test DB | Use the project's direct connection string from Settings → Database |
| A migration fails on `auth.users` | Applied as a non-owner role | Use `supabase db push`, or the SQL editor (runs as the owner), or the direct connection string as `postgres` |
| `bootstrap:staff` says "no account" | You have not signed in yet | Sign in once through the app first, then re-run |
| A card will not publish | Link not checked, or high-impact self-approved | Run `check:links`; have someone other than the author approve high-impact cards |
| Signup does not create a profile | Trigger missing | It is in `20261114130000_identity.sql`; confirm that migration applied |
| `test:e2e` all skip | Env vars not passed to the command | Prefix the command with both `NEXT_PUBLIC_*` values, or put them in `.env.local` |

## If you would rather not create a hosted project

The alternative is a **container runtime** on a machine I can reach, so the full
local Supabase stack (`supabase start`) can run — `supabase/config.toml` is
already configured for it, including the Inbucket mail catcher so magic links
work without sending real email. Either route clears the same blocker.

If neither is possible yet, the work continues: the tests stay written and
skipped, and nothing is reported as verified that has not run. The schema,
seeds and setup scripts are proven ready, so connection is turnkey the moment
a project exists.
