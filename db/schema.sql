-- VShare v2 PostgreSQL schema for Supabase.
-- Apply from the Supabase SQL editor or migration runner before deployment.

create extension if not exists pgcrypto;

do $$ begin
  create type public.content_event_type as enum ('view', 'watch_time', 'save', 'like', 'skip');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.content_memory_status as enum ('viewed', 'skipped', 'saved', 'liked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  color text not null default '#f5c451',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  onboarding_complete boolean not null default false,
  selected_topic_id uuid references public.topics(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_topic_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  weight numeric(6,3) not null default 0.5,
  selected boolean not null default false,
  muted boolean not null default false,
  last_selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id),
  constraint user_topic_preferences_weight_check check (weight between -1 and 5)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete restrict,
  title text not null,
  summary text not null default '',
  body_text text not null default '',
  source_name text not null default 'VShare',
  source_url text,
  media_url text,
  duration_seconds integer not null default 0,
  quality_score numeric(6,3) not null default 1,
  popularity_score numeric(6,3) not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.content_memory (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  status public.content_memory_status not null,
  last_event_type public.content_event_type not null,
  watch_time_seconds integer not null default 0,
  event_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table if not exists public.content_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  event_type public.content_event_type not null,
  watch_time_seconds integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists topics_active_slug_idx
  on public.topics (is_active, slug);

create index if not exists profiles_selected_topic_idx
  on public.profiles (selected_topic_id);

create index if not exists user_topic_preferences_user_weight_idx
  on public.user_topic_preferences (user_id, muted, weight desc, last_selected_at desc);

create index if not exists content_items_topic_feed_idx
  on public.content_items (topic_id, published_at desc, quality_score desc, popularity_score desc);

create index if not exists content_memory_user_status_idx
  on public.content_memory (user_id, status, updated_at desc);

create index if not exists content_events_user_created_idx
  on public.content_events (user_id, created_at desc);

create index if not exists content_events_content_type_idx
  on public.content_events (content_id, event_type, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_topic_preferences_touch_updated_at on public.user_topic_preferences;
create trigger user_topic_preferences_touch_updated_at
  before update on public.user_topic_preferences
  for each row execute function public.touch_updated_at();

drop trigger if exists content_memory_touch_updated_at on public.content_memory;
create trigger content_memory_touch_updated_at
  before update on public.content_memory
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.adjust_topic_weight(
  p_user_id uuid,
  p_topic_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  insert into public.user_topic_preferences (user_id, topic_id, weight)
  values (p_user_id, p_topic_id, least(5, greatest(-1, 0.5 + p_delta)))
  on conflict (user_id, topic_id)
  do update set
    weight = least(5, greatest(-1, public.user_topic_preferences.weight + p_delta)),
    muted = case
      when public.user_topic_preferences.weight + p_delta < -0.75 then true
      else public.user_topic_preferences.muted
    end;
end;
$$;

create or replace function public.record_content_event(
  p_user_id uuid,
  p_content_id uuid,
  p_event_type public.content_event_type,
  p_watch_time_seconds integer default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic_id uuid;
  v_status public.content_memory_status;
  v_delta numeric := 0;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  select topic_id into v_topic_id
  from public.content_items
  where id = p_content_id;

  if v_topic_id is null then
    raise exception 'content item not found';
  end if;

  insert into public.content_events (
    user_id,
    content_id,
    topic_id,
    event_type,
    watch_time_seconds,
    metadata
  )
  values (
    p_user_id,
    p_content_id,
    v_topic_id,
    p_event_type,
    greatest(0, coalesce(p_watch_time_seconds, 0)),
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_status := case p_event_type
    when 'skip' then 'skipped'::public.content_memory_status
    when 'save' then 'saved'::public.content_memory_status
    when 'like' then 'liked'::public.content_memory_status
    else 'viewed'::public.content_memory_status
  end;

  insert into public.content_memory (
    user_id,
    content_id,
    status,
    last_event_type,
    watch_time_seconds,
    event_count
  )
  values (
    p_user_id,
    p_content_id,
    v_status,
    p_event_type,
    greatest(0, coalesce(p_watch_time_seconds, 0)),
    1
  )
  on conflict (user_id, content_id)
  do update set
    status = excluded.status,
    last_event_type = excluded.last_event_type,
    watch_time_seconds = greatest(public.content_memory.watch_time_seconds, excluded.watch_time_seconds),
    event_count = public.content_memory.event_count + 1;

  v_delta := case p_event_type
    when 'save' then 0.25
    when 'like' then 0.20
    when 'watch_time' then least(0.15, greatest(0, p_watch_time_seconds)::numeric / 600)
    when 'view' then 0.05
    when 'skip' then -0.25
  end;

  perform public.adjust_topic_weight(p_user_id, v_topic_id, v_delta);
end;
$$;

create or replace function public.get_feed_items(
  p_user_id uuid,
  p_topic_id uuid default null,
  p_limit integer default 12,
  p_cursor timestamptz default null
)
returns table (
  id uuid,
  topic_id uuid,
  topic_name text,
  title text,
  summary text,
  source_name text,
  source_url text,
  media_url text,
  duration_seconds integer,
  quality_score numeric,
  popularity_score numeric,
  published_at timestamptz,
  next_cursor timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with resolved_topic as (
    select coalesce(
      p_topic_id,
      (select selected_topic_id from public.profiles where user_id = p_user_id),
      (
        select topic_id
        from public.user_topic_preferences
        where user_id = p_user_id and muted = false
        order by selected desc, weight desc, last_selected_at desc nulls last
        limit 1
      )
    ) as topic_id
  )
  select
    c.id,
    c.topic_id,
    t.name as topic_name,
    c.title,
    c.summary,
    c.source_name,
    c.source_url,
    c.media_url,
    c.duration_seconds,
    c.quality_score,
    c.popularity_score,
    c.published_at,
    c.published_at as next_cursor
  from public.content_items c
  join public.topics t on t.id = c.topic_id
  cross join resolved_topic rt
  left join public.user_topic_preferences pref
    on pref.user_id = p_user_id
   and pref.topic_id = c.topic_id
  where t.is_active = true
    and p_user_id = auth.uid()
    and rt.topic_id is not null
    and c.topic_id = rt.topic_id
    and (p_cursor is null or c.published_at < p_cursor)
    and not exists (
      select 1
      from public.content_memory m
      where m.user_id = p_user_id
        and m.content_id = c.id
        and m.status in ('viewed', 'skipped')
    )
  order by
    coalesce(pref.weight, 0.5) desc,
    c.quality_score desc,
    c.popularity_score desc,
    c.published_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

alter table public.topics enable row level security;
alter table public.profiles enable row level security;
alter table public.user_topic_preferences enable row level security;
alter table public.content_items enable row level security;
alter table public.content_memory enable row level security;
alter table public.content_events enable row level security;

drop policy if exists "topics are readable" on public.topics;
create policy "topics are readable"
  on public.topics for select
  using (true);

drop policy if exists "profiles are user owned" on public.profiles;
create policy "profiles are user owned"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "preferences are user owned" on public.user_topic_preferences;
create policy "preferences are user owned"
  on public.user_topic_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "content is readable" on public.content_items;
create policy "content is readable"
  on public.content_items for select
  using (true);

drop policy if exists "memory is user owned" on public.content_memory;
create policy "memory is user owned"
  on public.content_memory for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "events are user owned" on public.content_events;
create policy "events are user owned"
  on public.content_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.topics (slug, name, description)
values
  ('technology', 'Technology', 'Software, AI, product, and systems thinking.'),
  ('business', 'Business', 'Startups, strategy, markets, and execution.'),
  ('science', 'Science', 'Research, discovery, and practical science.'),
  ('health', 'Health', 'Wellness, nutrition, fitness, and mental health.'),
  ('design', 'Design', 'UX, visual systems, product design, and creativity.'),
  ('finance', 'Finance', 'Personal finance, investing, economics, and markets.'),
  ('education', 'Education', 'Learning methods, skills, and knowledge building.'),
  ('culture', 'Culture', 'Books, media, history, and society.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;
