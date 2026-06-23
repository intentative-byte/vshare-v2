# VShare v2

VShare v2 is a production-grade rebuild focused on feed speed, content relevance, topic memory, user retention, stability, and mobile responsiveness.

No new product features are included beyond the requested core modules:

- User system: Supabase Auth, profiles, preferences
- Topic engine: persisted selected topic and Explore -> Feed synchronization
- Feed engine: fast topic-filtered cursor pagination and infinite scroll
- Memory engine: viewed/skipped/saved/liked content memory to avoid repetition
- Calibration engine: relevance weighting from views, watch time, saves, likes, and skips
- Analytics: append-only content event tracking
- UI: black/gold responsive VShare theme

## Tech stack

- Frontend: Next.js App Router, TypeScript, Tailwind
- Backend: Next.js API routes
- Database: PostgreSQL on Supabase
- Authentication: Supabase Auth
- Hosting: Render

## System architecture

See [`docs/architecture.md`](docs/architecture.md) for the full architecture, module boundaries, and folder structure.

```text
Browser
  -> Next.js App Router + middleware
  -> Next.js API routes
  -> Supabase Auth + PostgreSQL
```

## Folder structure

```text
app/
  api/                 API routes for feed, topics, memory, analytics, calibration, profile
  explore/             Topic exploration page
  feed/                Infinite feed page
  login/               Supabase Auth page
  onboarding/          Initial preferences page
  profile/             Profile and memory page
db/
  schema.sql           PostgreSQL schema, indexes, RLS, RPCs, seed topics
docs/
  architecture.md      System architecture
  roadmap.md           Development roadmap
src/
  components/          UI, layout, feed, topic, auth, profile components
  lib/                 Env, validation, API helpers, Supabase clients
  types/               Domain types
```

## Database schema

Apply [`db/schema.sql`](db/schema.sql) to Supabase before running the app. It creates:

- `topics`
- `profiles`
- `user_topic_preferences`
- `content_items`
- `content_memory`
- `content_events`

It also includes:

- Feed indexes
- Row-level security policies
- `get_feed_items` RPC
- `record_content_event` RPC
- `adjust_topic_weight` RPC
- New-user profile trigger
- Starter topic seed data

## Environment variables

Copy `.env.example` to `.env.local` for local development.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FEED_PAGE_SIZE=12
```

`SUPABASE_SERVICE_ROLE_KEY` is reserved for deployment/admin workflows. The app routes use authenticated Supabase clients and RLS.

## Local development

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Render deployment

Render configuration is included in [`render.yaml`](render.yaml).

Set the environment variables listed above in Render and deploy the web service. The health check is `/api/health`.

## Development roadmap

See [`docs/roadmap.md`](docs/roadmap.md).
