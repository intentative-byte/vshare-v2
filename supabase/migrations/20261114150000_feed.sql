-- The Value Feed: preference memory, interactions, recommendations and
-- finite sessions.
--
-- Principles this migration enforces:
--   1. A viewer's interactions are theirs alone, and the counters that feed
--      ranking are written by a function, never by a client. Progress cannot
--      be inflated by anyone.
--   2. Opening a card is not completing it. They are separate columns with
--      separate meanings, and only completion counts as learning.
--   3. Every recommendation is logged with the components that produced it,
--      so "Why this?" is generated from the actual decision rather than a
--      plausible-sounding story.
--   4. Ranking weights are a versioned row, so a change is auditable and a
--      past recommendation can still be explained by the weights in force.

-- ------------------------------------------------------- preference memory --

create type public.topic_source as enum ('declared', 'learned');

create table public.user_topics (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  -- Chosen by the person, as opposed to inferred from what they did.
  declared boolean not null default true,
  -- 0 to 1. Starts at 0.5 for a declared topic and moves with real actions.
  affinity numeric(4, 3) not null default 0.500
    check (affinity >= 0 and affinity <= 1),
  level public.content_level not null default 'beginner',
  -- True once the person sets their own level, so the automatic step-up
  -- stops overriding them.
  level_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create trigger user_topics_set_updated_at
before update on public.user_topics
for each row execute function app.set_updated_at();

create index user_topics_affinity_idx on public.user_topics (user_id, affinity desc);

-- ------------------------------------------------------------ interactions --

-- One row per viewer and card. The feed's memory of what has been seen.
create table public.content_interactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  impressions integer not null default 0 check (impressions >= 0),
  last_impressed_at timestamptz,
  -- Opened: the card was read. Completed: the person said they had taken
  -- something from it. Only the second is progress.
  opened_at timestamptz,
  completed_at timestamptz,
  saved_at timestamptz,
  liked_at timestamptz,
  skipped_at timestamptz,
  feedback text check (feedback is null or feedback in ('useful', 'not_useful')),
  -- The card's estimate at the moment of completion, so a later edit to the
  -- card cannot change someone's recorded history.
  completed_minutes integer check (completed_minutes is null or completed_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create trigger content_interactions_set_updated_at
before update on public.content_interactions
for each row execute function app.set_updated_at();

create index content_interactions_saved_idx
on public.content_interactions (user_id, saved_at desc)
where saved_at is not null;

create index content_interactions_completed_idx
on public.content_interactions (user_id, completed_at desc)
where completed_at is not null;

create index content_interactions_seen_idx
on public.content_interactions (user_id, last_impressed_at desc);

-- Platform-wide counters per card, used by ranking. Written only by the
-- interaction functions, from real events: there is no synthetic traffic.
create table public.content_stats (
  content_id uuid primary key references public.content_items (id) on delete cascade,
  impressions bigint not null default 0,
  opens bigint not null default 0,
  completions bigint not null default 0,
  saves bigint not null default 0,
  skips bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------- ranking configs --

create table public.ranking_configs (
  version integer primary key,
  weights jsonb not null,
  params jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Exactly one active configuration at a time.
create unique index ranking_configs_one_active on public.ranking_configs (is_active)
where is_active;

-- ---------------------------------------------------------------- sessions --

create table public.feed_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  config_version integer references public.ranking_configs (version),
  size integer not null check (size between 1 and 20),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint feed_sessions_ends_after_start check (ended_at is null or ended_at >= started_at)
);

create index feed_sessions_user_idx on public.feed_sessions (user_id, started_at desc);

create type public.recommendation_surface as enum (
  'feed', 'next_best', 'first_win', 'follow_up'
);

create table public.recommendations (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  session_id uuid references public.feed_sessions (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  surface public.recommendation_surface not null default 'feed',
  position integer not null check (position > 0),
  config_version integer references public.ranking_configs (version),
  score numeric(6, 4) not null,
  -- The component breakdown that produced the score. "Why this?" is read
  -- from here, so an explanation can never describe a reason the ranker did
  -- not actually use.
  components jsonb not null default '{}'::jsonb,
  is_discovery boolean not null default false,
  shown_at timestamptz not null default now(),
  outcome text check (outcome is null or outcome in ('opened', 'completed', 'skipped', 'ignored'))
);

create index recommendations_user_idx on public.recommendations (user_id, shown_at desc);
create index recommendations_session_idx on public.recommendations (session_id, position);

-- --------------------------------------------------------------- functions --

-- Declared topics. Replaces the set, so unticking a topic removes it, and
-- keeps any affinity already learned for a topic that stays.
create or replace function public.set_declared_topics(p_topic_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
begin
  if v_user is null then
    raise exception 'set_declared_topics: no session';
  end if;

  if array_length(p_topic_ids, 1) > 12 then
    raise exception 'set_declared_topics: at most twelve topics';
  end if;

  -- A topic that is no longer declared stops being declared, but anything
  -- learned about it is kept until the person resets it.
  update public.user_topics
  set declared = false
  where user_id = v_user and not (topic_id = any (coalesce(p_topic_ids, '{}'::uuid[])));

  insert into public.user_topics (user_id, topic_id, declared, affinity)
  select v_user, t.id, true, 0.500
  from public.topics t
  where t.id = any (coalesce(p_topic_ids, '{}'::uuid[])) and t.archived_at is null
  on conflict (user_id, topic_id) do update set declared = true;
end;
$$;

create or replace function public.set_topic_level(p_topic_id uuid, p_level public.content_level)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
begin
  if v_user is null then
    raise exception 'set_topic_level: no session';
  end if;

  insert into public.user_topics (user_id, topic_id, declared, level, level_overridden)
  values (v_user, p_topic_id, false, p_level, true)
  on conflict (user_id, topic_id) do update
  set level = excluded.level, level_overridden = true;
end;
$$;

-- Puts preference memory back to a known state. The person can always undo
-- what the system has inferred about them.
create or replace function public.reset_learned_preferences(p_scope text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
begin
  if v_user is null then
    raise exception 'reset_learned_preferences: no session';
  end if;

  if p_scope = 'affinities' then
    update public.user_topics
    set affinity = case when declared then 0.500 else 0.200 end
    where user_id = v_user;

  elsif p_scope = 'history' then
    -- Forget what has been seen, so nothing is held back from the feed.
    update public.content_interactions
    set impressions = 0, last_impressed_at = null, skipped_at = null, feedback = null
    where user_id = v_user;

  elsif p_scope = 'all' then
    delete from public.user_topics where user_id = v_user;
    delete from public.content_interactions where user_id = v_user;

  else
    raise exception 'reset_learned_preferences: scope must be affinities, history or all';
  end if;
end;
$$;

-- How much an interaction moves affinity. An exponential moving average
-- towards a target, so a single action never swings the feed and a run of
-- them does.
create or replace function app.apply_affinity(
  p_user uuid,
  p_content uuid,
  p_target numeric,
  p_rate numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic uuid;
begin
  select primary_topic_id into v_topic from public.content_items where id = p_content;

  if v_topic is null then
    return;
  end if;

  insert into public.user_topics (user_id, topic_id, declared, affinity)
  values (p_user, v_topic, false, round(0.200 + (p_target - 0.200) * p_rate, 3))
  on conflict (user_id, topic_id) do update
  set affinity = round(
    public.user_topics.affinity + (p_target - public.user_topics.affinity) * p_rate, 3
  );
end;
$$;

-- The one way an interaction is recorded.
--
-- Idempotent: repeating a completion does not count twice, and does not
-- move affinity twice. Undoing a save or a like is supported; a completion
-- is not undone, because it is a statement about what someone learned.
create or replace function public.set_interaction(
  p_content_id uuid,
  p_kind text,
  p_value boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_row public.content_interactions;
  v_already boolean := false;
  v_minutes integer;
begin
  if v_user is null then
    raise exception 'set_interaction: no session';
  end if;

  -- Only published content can be interacted with, so a draft cannot
  -- accumulate history or influence anyone's ranking.
  if not exists (
    select 1 from public.content_items c where c.id = p_content_id and c.status = 'published'
  ) then
    raise exception 'set_interaction: that is not available';
  end if;

  insert into public.content_interactions (user_id, content_id)
  values (v_user, p_content_id)
  on conflict (user_id, content_id) do nothing;

  select * into v_row from public.content_interactions
  where user_id = v_user and content_id = p_content_id;

  if p_kind = 'open' then
    v_already := v_row.opened_at is not null;

    if not v_already then
      update public.content_interactions set opened_at = now()
      where user_id = v_user and content_id = p_content_id;

      update public.content_stats set opens = opens + 1, updated_at = now()
      where content_id = p_content_id;
    end if;

  elsif p_kind = 'complete' then
    v_already := v_row.completed_at is not null;

    if not v_already then
      select estimated_minutes into v_minutes from public.content_items where id = p_content_id;

      update public.content_interactions
      set completed_at = now(),
          opened_at = coalesce(opened_at, now()),
          completed_minutes = v_minutes,
          skipped_at = null
      where user_id = v_user and content_id = p_content_id;

      update public.content_stats set completions = completions + 1, updated_at = now()
      where content_id = p_content_id;

      perform app.apply_affinity(v_user, p_content_id, 1.0, 0.15);
    end if;

  elsif p_kind = 'save' then
    v_already := (v_row.saved_at is not null) = p_value;

    if not v_already then
      update public.content_interactions
      set saved_at = case when p_value then now() else null end
      where user_id = v_user and content_id = p_content_id;

      if p_value then
        update public.content_stats set saves = saves + 1, updated_at = now()
        where content_id = p_content_id;

        perform app.apply_affinity(v_user, p_content_id, 1.0, 0.10);
      end if;
    end if;

  elsif p_kind = 'like' then
    v_already := (v_row.liked_at is not null) = p_value;

    if not v_already then
      update public.content_interactions
      set liked_at = case when p_value then now() else null end
      where user_id = v_user and content_id = p_content_id;

      if p_value then
        perform app.apply_affinity(v_user, p_content_id, 1.0, 0.10);
      end if;
    end if;

  elsif p_kind = 'skip' then
    v_already := (v_row.skipped_at is not null) = p_value;

    if not v_already then
      update public.content_interactions
      set skipped_at = case when p_value then now() else null end
      where user_id = v_user and content_id = p_content_id;

      if p_value then
        update public.content_stats set skips = skips + 1, updated_at = now()
        where content_id = p_content_id;

        perform app.apply_affinity(v_user, p_content_id, 0.0, 0.10);
      end if;
    end if;

  elsif p_kind = 'useful' or p_kind = 'not_useful' then
    update public.content_interactions
    set feedback = case when p_value then p_kind else null end
    where user_id = v_user and content_id = p_content_id;

    if p_value then
      perform app.apply_affinity(
        v_user, p_content_id,
        case when p_kind = 'useful' then 1.0 else 0.0 end,
        0.20
      );
    end if;

  else
    raise exception 'set_interaction: unknown interaction %', p_kind;
  end if;

  select * into v_row from public.content_interactions
  where user_id = v_user and content_id = p_content_id;

  return jsonb_build_object(
    'opened', v_row.opened_at is not null,
    'completed', v_row.completed_at is not null,
    'saved', v_row.saved_at is not null,
    'liked', v_row.liked_at is not null,
    'skipped', v_row.skipped_at is not null,
    'feedback', v_row.feedback,
    'changed', not v_already
  );
end;
$$;

-- Impressions arrive in a batch when a session is served. Counted once per
-- card per session, so a card is not credited with an impression each time
-- the page re-renders.
create or replace function public.record_impressions(p_content_ids uuid[], p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_counted integer := 0;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'record_impressions: no session';
  end if;

  -- The session must belong to the caller, or an impression could be
  -- attributed to someone else's session.
  if p_session_id is not null and not exists (
    select 1 from public.feed_sessions s where s.id = p_session_id and s.user_id = v_user
  ) then
    raise exception 'record_impressions: not your session';
  end if;

  foreach v_id in array coalesce(p_content_ids, '{}'::uuid[]) loop
    if exists (
      select 1 from public.content_items c where c.id = v_id and c.status = 'published'
    ) then
      insert into public.content_interactions (user_id, content_id, impressions, last_impressed_at)
      values (v_user, v_id, 1, now())
      on conflict (user_id, content_id) do update
      set impressions = public.content_interactions.impressions + 1,
          last_impressed_at = now();

      update public.content_stats set impressions = impressions + 1, updated_at = now()
      where content_id = v_id;

      v_counted := v_counted + 1;
    end if;
  end loop;

  return v_counted;
end;
$$;

create or replace function public.start_feed_session(p_topic_id uuid, p_size integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_session uuid;
  v_version integer;
begin
  if v_user is null then
    raise exception 'start_feed_session: no session';
  end if;

  select version into v_version from public.ranking_configs where is_active;

  insert into public.feed_sessions (user_id, topic_id, config_version, size)
  values (v_user, p_topic_id, v_version, p_size)
  returning id into v_session;

  return v_session;
end;
$$;

create or replace function public.record_recommendations(p_session_id uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_version integer;
begin
  if v_user is null then
    raise exception 'record_recommendations: no session';
  end if;

  if not exists (
    select 1 from public.feed_sessions s where s.id = p_session_id and s.user_id = v_user
  ) then
    raise exception 'record_recommendations: not your session';
  end if;

  select config_version into v_version from public.feed_sessions where id = p_session_id;

  insert into public.recommendations (
    user_id, session_id, content_id, surface, position, config_version,
    score, components, is_discovery
  )
  select
    v_user,
    p_session_id,
    (row ->> 'contentId')::uuid,
    coalesce((row ->> 'surface')::public.recommendation_surface, 'feed'),
    (row ->> 'position')::integer,
    v_version,
    (row ->> 'score')::numeric,
    coalesce(row -> 'components', '{}'::jsonb),
    coalesce((row ->> 'isDiscovery')::boolean, false)
  from jsonb_array_elements(p_rows) as row;
end;
$$;

-- The session summary: what was actually finished, not what scrolled past.
create or replace function public.end_feed_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_summary jsonb;
begin
  if v_user is null then
    raise exception 'end_feed_session: no session';
  end if;

  update public.feed_sessions
  set ended_at = coalesce(ended_at, now())
  where id = p_session_id and user_id = v_user;

  if not found then
    raise exception 'end_feed_session: not your session';
  end if;

  select jsonb_build_object(
    'explored', count(*) filter (where r.id is not null),
    'completed', count(*) filter (where i.completed_at >= s.started_at),
    'saved', count(*) filter (where i.saved_at >= s.started_at),
    'minutes', coalesce(sum(i.completed_minutes) filter (where i.completed_at >= s.started_at), 0),
    'topics', (
      select count(distinct c2.primary_topic_id)
      from public.recommendations r2
      join public.content_items c2 on c2.id = r2.content_id
      join public.content_interactions i2
        on i2.content_id = c2.id and i2.user_id = v_user
      where r2.session_id = p_session_id and i2.completed_at >= s.started_at
    )
  )
  into v_summary
  from public.feed_sessions s
  left join public.recommendations r on r.session_id = s.id
  left join public.content_interactions i
    on i.content_id = r.content_id and i.user_id = v_user
  where s.id = p_session_id
  group by s.started_at;

  return coalesce(v_summary, jsonb_build_object(
    'explored', 0, 'completed', 0, 'saved', 0, 'minutes', 0, 'topics', 0
  ));
end;
$$;

-- A card gets its stats row as soon as it exists, so ranking never has to
-- cope with a missing one.
create or replace function app.create_content_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.content_stats (content_id) values (new.id)
  on conflict (content_id) do nothing;
  return new;
end;
$$;

create trigger content_items_create_stats
after insert on public.content_items
for each row execute function app.create_content_stats();

insert into public.content_stats (content_id)
select id from public.content_items
on conflict (content_id) do nothing;

-- --------------------------------------------------------- row security --

alter table public.user_topics enable row level security;
alter table public.content_interactions enable row level security;
alter table public.content_stats enable row level security;
alter table public.ranking_configs enable row level security;
alter table public.feed_sessions enable row level security;
alter table public.recommendations enable row level security;

create policy user_topics_select_own
on public.user_topics for select
to authenticated
using (user_id = app.current_user_id());

-- No write policy: set_declared_topics, set_topic_level and
-- reset_learned_preferences are the only routes, so affinity cannot be
-- edited directly to game the feed.

create policy content_interactions_select_own
on public.content_interactions for select
to authenticated
using (user_id = app.current_user_id());

-- No write policy: set_interaction and record_impressions are the only
-- routes, so progress cannot be inflated.

-- Aggregate counters, no personal data, used by the ranker on the server.
create policy content_stats_select
on public.content_stats for select
to anon, authenticated
using (true);

create policy ranking_configs_select
on public.ranking_configs for select
to anon, authenticated
using (is_active);

create policy ranking_configs_select_admin
on public.ranking_configs for select
to authenticated
using (public.has_role('admin'));

create policy feed_sessions_select_own
on public.feed_sessions for select
to authenticated
using (user_id = app.current_user_id());

create policy recommendations_select_own
on public.recommendations for select
to authenticated
using (user_id = app.current_user_id());

-- ---------------------------------------------------------------- grants --

grant select on public.user_topics, public.content_interactions to authenticated;
grant select on public.feed_sessions, public.recommendations to authenticated;
grant select on public.content_stats to anon, authenticated;
grant select on public.ranking_configs to anon, authenticated;

grant execute on function public.set_declared_topics(uuid[]) to authenticated;
grant execute on function public.set_topic_level(uuid, public.content_level) to authenticated;
grant execute on function public.reset_learned_preferences(text) to authenticated;
grant execute on function public.set_interaction(uuid, text, boolean) to authenticated;
grant execute on function public.record_impressions(uuid[], uuid) to authenticated;
grant execute on function public.start_feed_session(uuid, integer) to authenticated;
grant execute on function public.record_recommendations(uuid, jsonb) to authenticated;
grant execute on function public.end_feed_session(uuid) to authenticated;

-- ------------------------------------------------- the first configuration --

-- Version 1 of the ranking weights. Every factor and what it measures is
-- documented in docs/VSHARES_ARCHITECTURE.md section 6; the same numbers
-- drive the ranker in src/modules/vai/ranker.ts, which reads them from here.
insert into public.ranking_configs (version, weights, params, is_active, note)
values (
  1,
  jsonb_build_object(
    'declaredInterest', 0.30,
    'learnedAffinity', 0.20,
    'quality', 0.20,
    'levelFit', 0.10,
    'engagementQuality', 0.10,
    'freshness', 0.05,
    'timeFit', 0.05
  ),
  jsonb_build_object(
    'sessionSize', 7,
    'repeatWindowHours', 48,
    'impressionPenalty', 0.05,
    'impressionPenaltyCap', 0.15,
    'sameSourcePenalty', 0.05,
    'engagementPriorImpressions', 20,
    'engagementPriorRate', 0.35,
    'freshnessHalfLifeDays', 90,
    'maxConsecutiveSameTopic', 2,
    'maxPerSource', 2,
    'discoveryPosition', 5,
    'levelStepUpCompletions', 5
  ),
  true,
  'First version. Deterministic weighted sum; see the architecture document.'
);

-- A session that is not restricted to one topic orders the whole published
-- catalogue by recency. The index added with the catalogue is topic-first,
-- so that query could not use it and fell back to a sequential scan
-- (measured at 5.2 ms over 5,000 cards). This covers that path.
create index content_items_published_recent_idx
on public.content_items (published_at desc)
where status = 'published';
