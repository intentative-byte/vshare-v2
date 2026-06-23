# VShare v2 development roadmap

This roadmap keeps VShare v2 scoped to the requested rebuild. It does not introduce new product features.

## Phase 1 - Production foundation

- App Router scaffold with TypeScript strict mode.
- Tailwind 4 black/gold theme and responsive layout primitives.
- Supabase server/client helpers and auth middleware.
- Render deployment configuration and environment contract.
- PostgreSQL schema with indexes, RLS policies, and feed RPC.

## Phase 2 - User system

- `/login` for Supabase email/password sign in and sign up.
- `/onboarding` to collect topic preferences and set the initial active topic.
- `/profile` to edit display name and preferred topics.
- Auth redirects for anonymous and authenticated states.

## Phase 3 - Topic engine

- `/explore` topic grid backed by `/api/topics`.
- Immediate selected-topic persistence.
- Explore-to-feed sync through `profiles.selected_topic_id`.
- No random topic fallback; feed uses the persisted topic or the user's highest weighted topic.

## Phase 4 - Feed engine

- `/feed` topic-aware infinite scroll client.
- Cursor pagination with small page sizes.
- Abort stale requests when topic changes.
- Skeleton and empty states that do not block scroll.

## Phase 5 - Memory and calibration

- Store views, skips, saves, and likes in `content_memory`.
- Append analytics records to `content_events`.
- Exclude viewed/skipped content from feed results.
- Update `user_topic_preferences.weight` from user actions.

## Phase 6 - Hardening

- Validate all API input with Zod.
- Verify build, lint, and type-check in CI/deploy.
- Seed representative content and topics before production rollout.
- Add focused integration tests around feed filtering, memory exclusion, and topic persistence.
