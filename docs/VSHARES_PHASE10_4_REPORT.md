# VSHARES — Phase 10.4: real multimedia feed integration & editorial readiness

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **What this is:** the Phase 10.3M prototype becomes a tested, production-quality
  React feed, with an additive `content_media` schema (local only), approved-only
  governance, a licensed-image adapter, and the five videos prepared for human
  review. No remote DB write, **no migration applied remotely**, no automatic
  publishing, no RLS weakening, no live write test, no media download, no
  merge/deploy, no secret.

## 1. Audit
Reuses the existing feed routes, VAI ranker, content schema, moderation and RLS.
Safest path (chosen): add `content_media` as **migration 9** with the same
governance as `content_items` (published + staff select, server-write-only); add
a **dev-gated** demo route (404 in production, like `/dev/ui`); render the real
React feed with fixtures; and keep public delivery approved-only.

## 2. Real React feed (`src/components/feed/media-feed.tsx`)
Accessible, mobile-first `MediaFeed`: vertical **scroll-snap**, keyboard (↑/↓)
and touch nav, video/image/text cards, captions, **no autoplay**,
**pause-when-inactive** (IntersectionObserver + provider postMessage, so two
videos never play at once), honoured `prefers-reduced-motion`, a **Data-Saver**
notice, and clear creator attribution. Items are plain serializable data, so the
engine never enters the client bundle. **Axe: 0 violations** on `/dev/media` at
412px and 1280px.

## 3. VAI integration
`/dev/media` ranks the videos through the **existing VAI ranker** (`rankMedia`),
with platform stats forced to zero — **never ranked by raw views or likes**.
Only approved content may enter the public feed (enforced by `content_media`
RLS); the dev route renders fixtures only and is 404 in production.

## 4. `content_media` migration (migration 9 — local only)
`supabase/migrations/20261118120000_content_media.sql`: provider, provider_id,
original_url (unique), attribution (channel/channel_url), media_type, licence,
embeddable, captions, status, reviewer, timestamps; `content_id` FK to
`content_items`. **RLS**: published+parent-readable for the public, all for staff,
**no write policy or write grant → server-write-only**. A published row requires
review + confirmed embeddability. Proven by `supabase/tests/cases/270_content_media.sql`
(6 assertions): a normal user sees published media but not drafts; another user
cannot see drafts (isolation); staff see all; a client cannot insert or update
(server-write-only). **Not applied to any remote database.**

## 5. Licensed images (`src/factory/media/images.ts`)
One permitted source (Openverse). Records source, licence, creator and
attribution, and **rejects anything whose reuse rights are unclear** — a
conservative allowlist (`cc0`, `pdm`, `by`, `by-sa`); NonCommercial /
NoDerivatives / unlicensed are refused. A publicly accessible image is never
assumed reusable. Injected fetcher; tested offline.

## 6. Editorial readiness
`docs/VSHARES_MEDIA_EDITORIAL_INVENTORY.md`: the five oEmbed-verified videos with
learning objective, verified creator attribution, original source, embed
eligibility, quality assessment, **factual status (NOT fact-checked — human
review required)** and the moderation decision each needs. No automatic approval.

## 7. Testing
- **Unit (`media.test.ts`, 23):** provider URL validation, embedding
  restrictions (privacy host, no autoplay, preserved controls, captions,
  attribution), invalid media, candidate completeness, **no auto-approval +
  default-deny writes**, high-impact escalation, **popularity-is-not-quality**
  ranking, oEmbed verdicts, **licensed-image reuse-rights enforcement**, and
  prototype accessibility/safety.
- **DB (`270_content_media.sql`):** approved-only visibility, cross-user
  isolation, staff access, server-write-only.
- **E2E:** `/dev/media` answers **404 in production** (approved-only governance).
- **Accessibility:** axe over `/dev/media` (dev-tools build) — **0 violations**
  at mobile and desktop.

| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 293 passed, 2 skipped** (live tests), 22 files |
| `npm run test:db` | **PASS — 27 files, 456 assertions, 0 failed** (incl. `270_content_media`) |
| `npm run test:e2e` | **PASS — 92 passed / 72 skipped / 0 failed** (incl. `/dev/media` 404) |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 354 tracked files** |
| Gallery/media axe (dev-tools build) | **0 violations** — `/dev/ui` and `/dev/media`, both viewports |

## Performance & accessibility findings
- `/dev/media` axe-clean at both viewports; keyboard + touch navigable; no
  autoplay keeps data/CPU low and avoids simultaneous playback.
- Embeds are lazy-loaded (`loading="lazy"`) and use the privacy host; the engine
  stays out of the client bundle (serializable props only).
- Limitation: the image card is a labelled placeholder (no live Openverse image
  wired into the demo); the feed is dev-gated (not public) pending approved media.

## Phase 10.5 recommendation (owner-gated)
1. Apply migration 9 on the dev project (owner, via `supabase db push`).
2. Human review + approve the five videos through `moderate_content` into
   `content_media` (the first multimedia publish; second reviewer where flagged).
3. Add a server read `listApprovedMedia` and wire the public `/learn` feed to
   render **approved** `content_media` alongside cards.
4. Wire one real licensed Openverse image into the demo and add Vimeo oEmbed.

**Success criterion met:** a genuine, accessible, mobile-first learning feed
combining text, video and images, with approved-only public delivery
(server-write-only RLS, dev-gated prototype) and preserved editorial governance.
**STOP for owner review.**
