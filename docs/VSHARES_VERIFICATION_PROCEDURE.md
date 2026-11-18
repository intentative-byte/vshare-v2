# VSHARES — Verification procedure for the live authentication tests

- Date: 2026-11-14 · Status: **procedure ready; the tests have not been run.**
- Release blocker: the live-service tests must pass before production readiness. As of Milestone 5 there are **32** of them: authentication (8), catalogue (6), feed (8) and the first learning win (10).
- **Step-by-step setup for a development project is in `VSHARES_SUPABASE_SETUP.md`.**

## Why they are outstanding

The adapter in `src/platform/auth/provider.ts` is implemented, and everything
it writes to the database is covered by 166 assertions against real
PostgreSQL. What is not covered is the auth service itself: issuing a magic
link, exchanging the code for a session, creating an anonymous account, and
linking an identity to one.

The development environment this was built in has PostgreSQL but no container
runtime, so the local Supabase stack — which is what runs the auth service —
cannot start. The tests are therefore skipped with a stated reason rather than
replaced by weaker checks that would pass without a service.

```
32 skipped
74 passed
```

They run automatically as soon as a service is reachable. No code change is
needed.

## Option A — local stack (preferred)

Needs a machine with Docker or Podman. Nothing is paid for and nothing leaves
the machine.

```bash
npm install -g supabase
```

```bash
supabase start
```

That prints an API URL and an anon key. Put them in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=<the API URL it printed>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key it printed>
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

Apply the migrations and seed data:

```bash
supabase db reset
```

Then run the suites:

```bash
npm run test:e2e
```

Magic-link emails are caught by the local mail server (`inbucket`, port 54324
in `supabase/config.toml`), so no real email is sent and no address is needed.

Expected result: 62 passed, 0 skipped.

## Option B — a development project

Needs a Supabase project. The free tier is enough; no paid tier is required
for this.

1. Create a project in a UK or EU region. Name it so nobody mistakes it for production.
2. Apply the migrations in `supabase/migrations/` in filename order, through the SQL editor or `supabase db push`.
3. In the project's auth settings: enable email sign-in, enable anonymous sign-ins, disable password sign-in, and add `http://localhost:3100/auth/callback` as a redirect URL.
4. Put the project URL and the **anon** key in `.env.local`.
5. Run `npm run test:e2e`.

**Never put the service-role key in `.env.local` for this, never paste any key
into a chat, and never commit one.** The anon key is designed to be public;
the service-role key is not, and none of these tests need it.

## What each test proves

| Test | What it establishes |
|---|---|
| The form accepts an address and reports that a link was sent | The adapter reaches the auth service and the request succeeds |
| An unknown and a known address are answered identically | The sign-in page cannot be used to discover who has an account |
| A guest who acts gets an account, and keeps it when they register | Anonymous sign-in works and the account survives registration |
| Signing out ends the session | Session termination works |

Each runs at both phone and desktop width, which is why eight are skipped
rather than four.

## After they pass

1. Record the result in `docs/VSHARES_TEST_REPORT.md` with the date and the environment used.
2. Change the status of F-004 and F-006 in `docs/VSHARES_FEATURE_REGISTER.md` from implemented to tested.
3. Remove the release blocker from `docs/VSHARES_RELEASE_PLAN.md`.

Until then authentication is reported as **implemented, not verified**.
