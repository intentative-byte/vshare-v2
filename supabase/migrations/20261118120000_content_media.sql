-- Migration 9: content_media — embedded educational media attached to a card.
--
-- Additive and governed exactly like content_items: row-level security makes
-- only PUBLISHED media (whose parent card is readable) public; staff see all;
-- and the table is SERVER-WRITE-ONLY (no client insert/update/delete policy, so
-- only the service role or a SECURITY DEFINER function can write). Nothing is
-- rehosted here — we store the provider reference, attribution and licence, and
-- the player embeds the original.
--
-- NOT APPLIED to any remote database by this change.

create type public.media_provider as enum ('youtube', 'vimeo', 'image');

create table public.content_media (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  provider public.media_provider not null,
  -- Provider video id (null for a generic licensed image).
  provider_id text check (provider_id is null or provider_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  -- The canonical original URL. Part of identity, so duplicates are refused.
  original_url text not null
    check (original_url ~ '^https://' and char_length(original_url) <= 2000),
  media_type public.content_format not null default 'video',
  -- Creator / channel attribution. Never stripped.
  channel text not null check (char_length(btrim(channel)) between 2 and 160),
  channel_url text check (channel_url is null or (channel_url ~ '^https://' and char_length(channel_url) <= 2000)),
  title text not null check (char_length(btrim(title)) between 3 and 200),
  -- The educational objective shown with the media in the feed.
  objective text check (objective is null or char_length(btrim(objective)) between 10 and 300),
  -- Source/licence where relevant (e.g. 'CC-BY-4.0', 'standard-youtube-terms').
  licence text check (licence is null or char_length(btrim(licence)) between 2 and 120),
  -- Embedding eligibility, confirmed before display.
  embeddable boolean not null default false,
  captions_available boolean not null default false,
  status public.content_status not null default 'draft',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One row per provider video; a licensed image has a null provider_id and is
  -- distinguished by its original_url instead.
  unique (provider, provider_id),
  unique (original_url),

  -- Nothing goes live without a review and confirmed embedding eligibility.
  constraint content_media_published_needs_review check (
    status <> 'published' or (reviewed_at is not null and embeddable = true)
  )
);

create index content_media_content_idx on public.content_media (content_id);
create index content_media_status_idx on public.content_media (status);

alter table public.content_media enable row level security;

-- Public may read only published media whose parent card they may read.
create policy content_media_select_published on public.content_media
  for select
  using (status = 'published' and app.can_read_content(content_id));

-- Staff may read every media row (for the editorial queue).
create policy content_media_select_staff on public.content_media
  for select
  using (app.is_staff());

-- No insert/update/delete policy: the table is server-write-only. Only the
-- service role or a SECURITY DEFINER function may write it; a client role is
-- denied by row-level security, so no one can self-publish media.

-- SELECT only for the app roles. No insert/update/delete grant, so even if a
-- policy existed, a client role could not write: the table is server-write-only.
grant select on public.content_media to anon, authenticated;

comment on table public.content_media is
  'Embedded educational media (provider reference + attribution + licence) attached to a card. Server-write-only; only published media whose parent card is readable is public.';
