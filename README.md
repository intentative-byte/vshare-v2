# VShare v2

VShare v2 is a personalised learning and knowledge-sharing platform that delivers topic-specific content, remembers user preferences, adapts to behaviour, and turns scrolling into continuous growth.

This repository contains a full Next.js App Router implementation built with TypeScript, Tailwind CSS, Supabase Auth helpers, API routes, and a PostgreSQL schema.

## Tech stack

- Next.js with the App Router
- TypeScript
- Tailwind CSS
- Supabase SSR/Auth helpers
- Supabase PostgreSQL with RLS policies
- Render deployment blueprint

## Application routes

- `/login` - Supabase magic-link and GitHub OAuth sign-in
- `/onboarding` - collect topics, goals, and profile details
- `/feed` - personalised learning feed and resource submission
- `/explore` - topic discovery and featured resources
- `/profile` - learner profile and preference summary

## API routes

- `GET /api/posts` - list feed posts
- `POST /api/posts` - create a resource post for the signed-in user
- `GET /api/profile` - fetch the signed-in user's profile
- `PUT /api/profile` - update onboarding/profile details
- `GET /api/preferences` - fetch the signed-in user's preferences
- `PUT /api/preferences` - update onboarding preferences

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local` with your Supabase project values:

   ```bash
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Apply the database schema in Supabase:

   - Hosted Supabase: run `supabase/migrations/0001_initial_schema.sql` in the SQL editor.
   - Supabase CLI: run `supabase start`, then `supabase db reset` to apply migrations and `supabase/seed.sql`.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Verification

Run these checks before shipping:

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

`render.yaml` defines a Render web service for the Next.js app.

### Render setup

1. In Render, create a new Blueprint from this repository and select `render.yaml`.
2. Confirm the web service uses these commands:

   ```bash
   npm run build
   npm start
   ```

3. Set the required environment variables:

   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-render-service.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Deploy the service. Render provides the `PORT` environment variable at runtime, and `npm start` binds Next.js to that port.

The Render blueprint also sets `NODE_VERSION=22`. Keep `NEXT_PUBLIC_SITE_URL` aligned with the final Render URL so generated absolute links use the deployed origin.

## Notes

When Supabase environment variables are missing, server-rendered pages use demo content so the app can still lint, typecheck, and build in a fresh environment. Mutating API routes require a configured Supabase project and an authenticated user.
