# VSHARES — Connecting a development Supabase project

- Date: 2026-11-14
- Purpose: clear the 32 skipped live-service tests, which are a release blocker.
- Cost: nothing. The free tier is enough for everything below.

**Never paste a key into a chat, an issue or a commit.** Everything here uses
the publishable (anon) key, which is designed to be seen by browsers. The
service-role key is not needed for any of this, and I will not ask for one.

## What you do

### 1. Create the project

1. Sign in at supabase.com and create a new project.
2. Name it so nobody mistakes it for production — `vshares-dev` is fine.
3. Choose a **London or EU** region. The product launches in the UK and the data model assumes a UK or EU region.
4. Set a database password when prompted and keep it in your password manager. It is not needed below.

### 2. Configure authentication

In the project dashboard, under Authentication → Providers and Settings:

- **Email**: enabled. Turn **off** "Enable password sign-in" — VSHARES has no passwords.
- **Anonymous sign-ins**: enabled. This is what lets someone learn before registering.
- **Google**: leave disabled for now. It needs an OAuth client, which is a separate step and not required to clear the blocked tests.
- **Redirect URLs**: add `http://localhost:3100/auth/callback` and `http://localhost:3000/auth/callback`.
- **Site URL**: `http://localhost:3000`.

### 3. Apply the schema

Easiest route, in the dashboard's SQL editor: open each file in
`supabase/migrations/` **in filename order** and run it.

```text
20261114120000_baseline.sql
20261114130000_identity.sql
20261114140000_catalogue.sql
20261114150000_feed.sql
20261114160000_measurement.sql
```

Or, with the Supabase CLI installed and logged in:

```bash
supabase link --project-ref <your-project-ref>
```

```bash
supabase db push
```

### 4. Load the taxonomy and the draft cards

In the SQL editor, run these two, in order:

```text
supabase/seed/010_taxonomy.sql
supabase/seed/020_cards_batch_1.sql
```

The ten cards load as **drafts**. They cannot be published until their links
are checked, which is enforced by the database.

### 5. Send me two values

From Project Settings → API:

- **Project URL** — looks like `https://abcdefghijkl.supabase.co`
- **Publishable (anon) key** — the long key labelled `anon` / `public`

Put them in `.env.local`, or send them to me here. **Both are safe to share:
the anon key is public by design and every table is protected by row-level
security.** Do not send the `service_role` key.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## What I do with them

```bash
npm run check:links
```

Checks all ten source links against the live web and records the result.
Only then can anything be published.

```bash
npm run test:e2e
```

Runs the 32 currently-skipped tests: authentication (8), catalogue (6),
feed (8) and the first learning win (10). I will report exactly what passed
and what did not, and will not describe any of them as passing until they
have run.

```bash
npm run test:db
```

Already passing locally; re-run against the project to confirm the policies
behave identically there.

## Making yourself an administrator

Once you have signed in once, run this in the SQL editor, replacing the
address with the one you signed in with:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```

That gives you `/admin`, where the moderation queue and the first-win funnel
live.

## If you would rather not create a project

The alternative is a container runtime on a machine I can reach, so the
local Supabase stack can run. Either clears the same blocker. If neither is
possible for now, the work continues — the tests stay written and skipped,
and nothing will be reported as verified that has not run.
