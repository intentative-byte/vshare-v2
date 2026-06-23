# VShare v2 system architecture

VShare v2 is a focused Next.js application backed by Supabase Auth and PostgreSQL. The foundation is organized around five production concerns: fast topic-specific feeds, persisted topic memory, repetition avoidance, reliable auth/session handling, and mobile-first black/gold UI consistency.

## Runtime architecture

```text
Browser
  |
  | Supabase Auth cookies + fetch
  v
Next.js App Router
  |-- Server components for initial page shells
  |-- Client components for auth forms, feed scrolling, topic selection
  |-- Middleware for session refresh and protected routes
  |
  | Next.js API routes
  |-- /api/feed          topic-filtered feed windows
  |-- /api/topics        topic list + selected topic persistence
  |-- /api/memory        viewed/skipped item memory
  |-- /api/calibration   preference updates from user actions
  |-- /api/analytics     event ingestion
  |-- /api/profile       profile and preference reads/writes
  |
  v
Supabase
  |-- Auth users
  |-- PostgreSQL tables, indexes, RLS policies, and RPCs
```

## Core modules

### User system

- Supabase Auth manages email/password sessions.
- `profiles` stores display name, onboarding state, and last selected topic.
- Middleware refreshes cookies and redirects anonymous users away from protected pages.
- Profile APIs read and update preferences through authenticated server clients.

### Topic engine

- `topics` is the canonical topic catalog.
- `user_topic_preferences` stores selected, weighted, and muted topics per user.
- Explore uses `/api/topics` to persist a selected topic immediately.
- Feed reads `profiles.selected_topic_id` first, then falls back to the highest weighted user topic.

### Feed engine

- `/api/feed` returns a small, indexed page of content for the active topic.
- The SQL function excludes viewed/skipped content and orders by topic match, preference weight, popularity, recency, and quality score.
- Client infinite scroll uses `IntersectionObserver`, abortable fetches, and a cursor to prevent duplicate page requests.

### Memory engine

- `content_memory` stores item status (`viewed`, `skipped`, `saved`, `liked`) per user/content item.
- Analytics events also write memory for view/skip/save/like actions.
- Feed queries anti-join against terminal memory statuses so previously seen content is not repeated.

### Calibration engine

- `/api/calibration` adjusts topic weights based on events:
  - views and watch time add light positive signal
  - saves and likes add strong positive signal
  - skips add negative signal
- Weight changes are clamped in the database to keep relevance stable.

### Analytics

- `content_events` stores views, watch time, saves, likes, and skips.
- Events are append-only for behavioral analysis.
- Aggregates can be derived by user, content, topic, and event type.

## Performance and stability choices

- Feed route is dynamic but index-backed and paginated.
- API payloads are validated with Zod.
- Server code uses typed domain models and narrow response shapes.
- UI avoids blocking the main thread during scrolling and renders skeleton placeholders.
- Mobile layout uses a sticky top bar and bottom navigation; desktop uses a sidebar.
- Topic changes cancel in-flight feed requests and reset the cursor immediately.

## Folder structure

```text
app/
  api/
    analytics/route.ts
    calibration/route.ts
    feed/route.ts
    health/route.ts
    memory/route.ts
    profile/route.ts
    topics/route.ts
  explore/page.tsx
  feed/page.tsx
  login/page.tsx
  onboarding/page.tsx
  profile/page.tsx
  globals.css
  layout.tsx
  page.tsx
db/
  schema.sql
docs/
  architecture.md
  roadmap.md
src/
  components/
    feed/
    layout/
    profile/
    topics/
    ui/
  lib/
    api-response.ts
    env.ts
    feed.ts
    validators.ts
    supabase/
  types/
    domain.ts
middleware.ts
render.yaml
```
