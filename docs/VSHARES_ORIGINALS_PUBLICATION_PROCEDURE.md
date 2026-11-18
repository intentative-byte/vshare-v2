# VSHARES Originals — controlled DEVELOPMENT publication procedure

- **Scope:** owner-run, development-only. Publishes one reviewed Original card and
  then its hosted video, in order, with verification at each step. **This session
  does not execute it.** Every ⛔ needs explicit owner approval.
- **Why order matters:** `content_media` is publicly visible only when its parent
  card is published (`app.can_read_content`), so the **card is published first**.

## Preconditions (⛔ STOP before starting)
- [ ] Migration 9 applied on dev (Gate 1 done).
- [ ] The card has been **reviewed by a human** (see `VSHARES_ORIGINALS_BATCH_1.md`);
      REVISION cards fixed; high-impact cards (budget, sleep) have an **independent
      second reviewer**.
- [ ] The card's **source link is checked** (`npm run check:links` or manual) —
      the DB refuses to publish a card whose link is unchecked.
- [ ] The hosted video (if any) has been **watched and approved** by a human and,
      for a debated topic, carries its editorial note.

## Stage A — publish the parent card (existing moderation path)
Use the admin/moderation flow (`/admin/cards`) or the server functions:
```sql
-- as a moderator (never a bare client):
select public.record_link_check(:card_id, true);   -- records a real link check
select public.moderate_content(:card_id, 'approve');-- sets published + reviewed + published_at
```
Verify (read-only):
```sql
select slug, status, link_checked_at, published_at from public.content_items where id = :card_id;
-- expect status='published', link_checked_at and published_at set
select count(*) from public.content_items where status='published';  -- >= 1
```
As an **anonymous** client, confirm the card renders at `/c/<slug>` and `/learn`
shows cards. ⛔ **STOP** — approve moving to Stage B.

## Stage B — publish the hosted media (server-write-only)
Media is written by the **service role** only (no client write). Per approved
video, insert with the **published** parent `content_id`:
```sql
insert into public.content_media
  (content_id, provider, provider_id, original_url, media_type, channel,
   channel_url, title, objective, licence, embeddable, captions_available,
   status, reviewed_by, reviewed_at)
values
  (:published_card_id, 'youtube', :video_id, :original_url, 'video',
   :channel, :channel_url, :title, :objective, 'standard-youtube-terms',
   true, true, 'published', :reviewer_uuid, now());
```
RLS verification:
```sql
-- anon/authenticated sees exactly the approved, published media under a readable card:
select provider, title from public.content_media where status='published';
-- a draft media row, or media on an unpublished card, must NOT be visible to a non-staff client.
```
Open `/learn` as an anonymous client: the approved video appears below the value
session, with attribution and captions, and **nothing autoplays**. ⛔ **STOP** —
approve any further publishing.

## Editorial gates (enforced)
- Card: link check + moderation approval (DB constraints
  `content_published_needs_link_check`, `content_published_needs_review`).
- High-impact: independent second reviewer (DB refuses self-approval of
  high-impact; the budget and sleep cards qualify).
- Media: server-write-only; published ⇒ reviewed + embeddable
  (`content_media_published_needs_review`).

## Failure handling & rollback (development only)
- **Card publish fails:** read the DB message (unchecked link / high-impact
  self-approval). Fix the precondition; do not force.
- **Un-publish a card:** `select public.moderate_content(:card_id, 'archive');`
  (or set back to draft via the admin path). RLS hides it immediately; any media
  under it also disappears (parent no longer readable).
- **Remove a media row:** as service role, `delete from public.content_media where
  id = :media_id;` or set `status='archived'`.
- **Full media rollback:** `delete from public.content_media;` (keeps the table).

## Never, in this procedure
No production target, no client write grant, no RLS change, no automatic
approval, no secret. Publishing is one reviewed item at a time, owner-authorised.
