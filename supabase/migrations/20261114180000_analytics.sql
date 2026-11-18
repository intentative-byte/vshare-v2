-- Essential analytics: measuring value, not engagement.
--
-- Milestone 6 recorded events as the browser reported them. That is fine for
-- things only the browser can see, and wrong for anything that has to be
-- trusted: a client can replay "card_completed" a thousand times and the
-- count would believe it.
--
-- So measurement is split by how it is produced, and every row says which:
--
--   derived    Recomputed from the product tables by rollup_day(). One
--              completion is one row in content_interactions, so replaying
--              anything changes nothing, and re-running the rollup produces
--              the same numbers. These are the metrics decisions rest on.
--
--   reported   Counted as the browser reported it. Cannot be verified, is
--              rate limited, and is labelled as such everywhere it appears.
--
-- Neither kind holds an identifier, so both are recorded for everyone,
-- including a visitor who has consented to nothing.
--
-- The reporting day is UTC, everywhere, via app.day_of(). A database
-- session's own TimeZone setting cannot move a completion between days.

create type public.analytics_source as enum ('derived', 'reported');

-- ------------------------------------------------------------- the day --

-- One definition of "which day did this happen on", used by every metric.
--
-- Deliberately without `set search_path`: a SQL function that carries a SET
-- clause cannot be inlined by the planner, and this one is evaluated per
-- row. Measured on 80,000 interactions: 95 ms with the SET clause, 6 ms
-- without it, because inlining lets the index be used at all. It is safe
-- here only because the body names no objects — `at time zone` is resolved
-- to pg_catalog.timezone by the grammar itself, and `::date` is a built-in
-- cast — so there is nothing a search_path could redirect.
create or replace function app.day_of(p_at timestamptz)
returns date
language sql
immutable
as $$
  select (p_at at time zone 'UTC')::date;
$$;

comment on function app.day_of(timestamptz) is
  'The reporting day in UTC. Never ::date, which depends on the session TimeZone.';

-- ------------------------------------------ learner milestones --

-- Two measurements about a person's progress: how long their first win took,
-- and when they stopped being a guest.
--
-- These were first written as columns on `profiles`. That was wrong, and a
-- test caught it: profiles has a policy making a public profile readable by
-- anyone, and another letting any moderator read every row. Row-level
-- security has no column granularity, so both measurements would have been
-- readable by the world and by staff. They live here instead, under the same
-- rule as analytics_events: the person can read their own, and nobody else
-- can read them at all.
create table public.learner_milestones (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Browser-reported seconds from arrival to first completion. Written once.
  first_completion_seconds integer
    check (first_completion_seconds is null
           or (first_completion_seconds >= 0 and first_completion_seconds <= 86400)),
  -- When this guest account became a registered one in place.
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.learner_milestones is
  'Per-person progress measurements. Readable only by the person. Never by staff, never by the public.';

alter table public.learner_milestones enable row level security;

create policy learner_milestones_select_own
on public.learner_milestones for select
to authenticated
using (user_id = app.current_user_id());

grant select on public.learner_milestones to authenticated;

-- The browser is the only thing that can time arrival to first completion.
-- Writing it once, against the account, means a replay cannot inflate it and
-- nothing new is created to track anyone by.
create or replace function public.record_first_completion_seconds(p_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_existing integer;
  v_has_completion boolean;
begin
  if v_user is null then
    return false;
  end if;

  if p_seconds is null or p_seconds < 0 or p_seconds > 86400 then
    raise exception 'record_first_completion_seconds: out of range';
  end if;

  select first_completion_seconds into v_existing
  from public.learner_milestones where user_id = v_user;

  -- Set once. A second call is not an error, it simply changes nothing.
  if v_existing is not null then
    return false;
  end if;

  -- And only for someone who has actually completed something, so the
  -- benchmark cannot be reported by a browser that never finished a card.
  select exists (
    select 1 from public.content_interactions
    where user_id = v_user and completed_at is not null
  ) into v_has_completion;

  if not v_has_completion then
    return false;
  end if;

  insert into public.learner_milestones (user_id, first_completion_seconds)
  values (v_user, p_seconds)
  on conflict (user_id) do update
  set first_completion_seconds = excluded.first_completion_seconds
  where public.learner_milestones.first_completion_seconds is null;

  return true;
end;
$$;

grant execute on function public.record_first_completion_seconds(integer) to authenticated;

-- When a guest account becomes a registered one in place, nothing recorded
-- the moment it happened, so the conversion could not be dated. This does.
create or replace function app.record_conversion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_anonymous and not new.is_anonymous then
    insert into public.learner_milestones (user_id, converted_at)
    values (new.id, now())
    on conflict (user_id) do update
    set converted_at = now()
    where public.learner_milestones.converted_at is null;
  end if;

  return new;
end;
$$;

create trigger users_record_conversion
after update on auth.users
for each row execute function app.record_conversion();

-- ------------------------------------------------------ the daily store --

alter table public.analytics_daily
  add column source public.analytics_source not null default 'reported';

alter table public.analytics_daily drop constraint analytics_daily_pkey;
alter table public.analytics_daily
  add constraint analytics_daily_pkey primary key (day, source, name, dimension, dimension_key);

comment on column public.analytics_daily.source is
  'derived: recomputed from the product tables, authoritative. reported: as the browser said, unverifiable.';

-- A day that has been computed and found nothing is not the same as a day
-- nobody computed. Without this, a gap reads as a zero.
create table public.analytics_rollups (
  day date primary key,
  computed_at timestamptz not null default now(),
  rows_written integer not null default 0,
  duration_ms integer
);

comment on table public.analytics_rollups is
  'Which days have been computed. A day absent here has no data; a day present with no counts genuinely had no activity.';

alter table public.analytics_rollups enable row level security;

create policy analytics_rollups_select_staff
on public.analytics_rollups for select
to authenticated
using (app.is_staff());

grant select on public.analytics_rollups to authenticated;

-- record_event keeps working, and now says plainly that what it writes is
-- reported rather than measured.
create or replace function public.record_event(
  p_name text,
  p_dimension text default 'all',
  p_dimension_key text default 'all',
  p_value numeric default null,
  p_session_id uuid default null,
  p_content_id uuid default null,
  p_topic_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_consent public.analytics_consent := 'unset';
begin
  if not app.is_known_event(p_name) then
    raise exception 'record_event: % is not a defined event', p_name;
  end if;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count, value_sum, value_count)
  values (
    app.day_of(now()), 'reported', p_name,
    coalesce(p_dimension, 'all'), coalesce(p_dimension_key, 'all'),
    1, coalesce(p_value, 0), case when p_value is null then 0 else 1 end
  )
  on conflict (day, source, name, dimension, dimension_key) do update
  set count = public.analytics_daily.count + 1,
      value_sum = public.analytics_daily.value_sum + coalesce(excluded.value_sum, 0),
      value_count = public.analytics_daily.value_count + excluded.value_count,
      updated_at = now();

  if v_user is null then
    return;
  end if;

  select analytics_consent into v_consent from public.preferences where user_id = v_user;

  if v_consent is distinct from 'granted' then
    return;
  end if;

  insert into public.analytics_events (name, user_id, session_id, content_id, topic_id, value)
  values (p_name, v_user, p_session_id, p_content_id, p_topic_id, p_value);
end;
$$;

-- ------------------------------------------------------------ the rollup --

-- Recomputes every derived metric for one day from the product tables.
--
-- Idempotent by construction: it removes the day's derived rows and writes
-- them again. Running it twice, or ten times, gives the same answer, which
-- is what makes reconciliation meaningful rather than circular.
create or replace function public.rollup_day(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_started timestamptz := clock_timestamp();
  v_rows integer := 0;
  v_written integer;
begin
  if p_day is null then
    raise exception 'rollup_day: a day is required';
  end if;

  if p_day > app.day_of(now()) then
    raise exception 'rollup_day: % is in the future', p_day;
  end if;

  delete from public.analytics_daily where day = p_day and source = 'derived';

  -- Cards completed, in total and by topic. One row per person per card, so
  -- this cannot be inflated by repeating anything.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count, value_sum, value_count)
  select p_day, 'derived', 'cards_completed', 'all', 'all', count(*),
         coalesce(sum(ci.completed_minutes), 0), count(ci.completed_minutes)
  from public.content_interactions ci
  where app.day_of(ci.completed_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'cards_completed', 'topic', t.slug, count(*)
  from public.content_interactions ci
  join public.content_items c on c.id = ci.content_id
  join public.topics t on t.id = c.primary_topic_id
  where app.day_of(ci.completed_at) = p_day
  group by t.slug;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'cards_saved', 'all', 'all', count(*)
  from public.content_interactions ci
  where app.day_of(ci.saved_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'cards_skipped', 'all', 'all', count(*)
  from public.content_interactions ci
  where app.day_of(ci.skipped_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'cards_opened', 'all', 'all', count(*)
  from public.content_interactions ci
  where app.day_of(ci.opened_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- People who completed at least one card. Not "visitors": someone who
  -- read and left is deliberately not counted anywhere.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'learners_active', 'all', 'all', count(distinct ci.user_id)
  from public.content_interactions ci
  where app.day_of(ci.completed_at) = p_day
  having count(distinct ci.user_id) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- First completions: the person's earliest completion fell on this day.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'first_completions', 'all', 'all', count(*)
  from (
    select ci.user_id, min(ci.completed_at) as first_at
    from public.content_interactions ci
    where ci.completed_at is not null
    group by ci.user_id
  ) f
  where app.day_of(f.first_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- Returning learners: completed today, and had completed before today.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'returning_learners', 'all', 'all', count(*)
  from (
    select ci.user_id
    from public.content_interactions ci
    where ci.completed_at is not null
    group by ci.user_id
    having count(*) filter (where app.day_of(ci.completed_at) = p_day) > 0
       and count(*) filter (where app.day_of(ci.completed_at) < p_day) > 0
  ) r
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- The browser-timed benchmark, attributed to the day of the completion it
  -- belongs to. value_sum / value_count is the mean; the dashboard shows a
  -- median, computed from the same table.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count, value_sum, value_count)
  select p_day, 'derived', 'first_completion_seconds', 'all', 'all',
         count(*), coalesce(sum(p.first_completion_seconds), 0), count(*)
  from public.learner_milestones p
  join (
    select ci.user_id, min(ci.completed_at) as first_at
    from public.content_interactions ci
    where ci.completed_at is not null
    group by ci.user_id
  ) f on f.user_id = p.user_id
  where p.first_completion_seconds is not null
    and app.day_of(f.first_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- Sessions. Started and completed are counted on their own days, so a
  -- session begun before midnight and finished after it is honestly split.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'sessions_started', 'all', 'all', count(*)
  from public.feed_sessions s
  where app.day_of(s.started_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count, value_sum, value_count)
  select p_day, 'derived', 'sessions_completed', 'all', 'all', count(*),
         coalesce(sum(extract(epoch from (s.ended_at - s.started_at))), 0), count(*)
  from public.feed_sessions s
  where app.day_of(s.ended_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'sessions_started', 'topic', t.slug, count(*)
  from public.feed_sessions s
  join public.topics t on t.id = s.topic_id
  where app.day_of(s.started_at) = p_day
  group by t.slug;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- Declared interests, by topic.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'topics_declared', 'topic', t.slug, count(*)
  from public.user_topics ut
  join public.topics t on t.id = ut.topic_id
  where ut.declared and app.day_of(ut.created_at) = p_day
  group by t.slug;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- Contributions and moderation.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'resources_submitted', 'all', 'all', count(*)
  from public.content_items c
  where c.origin = 'user_submitted' and app.day_of(c.created_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'submissions_reviewed', c.status::text, 'all', count(*)
  from public.content_items c
  where c.origin = 'user_submitted'
    and c.reviewed_at is not null
    and app.day_of(c.reviewed_at) = p_day
  group by c.status::text;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'content_reported', 'reason', r.reason::text, count(*)
  from public.content_reports r
  where app.day_of(r.created_at) = p_day
  group by r.reason::text;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'reports_resolved', 'outcome', r.status::text, count(*)
  from public.content_reports r
  where r.resolved_at is not null and app.day_of(r.resolved_at) = p_day
  group by r.status::text;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'cards_published', 'all', 'all', count(*)
  from public.content_items c
  where c.published_at is not null and app.day_of(c.published_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- Accounts. Guests created, accounts registered, and guests converted.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'guests_created', 'all', 'all', count(*)
  from auth.users u
  where u.is_anonymous and app.day_of(u.created_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'accounts_registered', 'all', 'all', count(*)
  from auth.users u
  where not u.is_anonymous and app.day_of(u.created_at) = p_day
  having count(*) > 0;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  -- A conversion is a guest account that became registered: in place
  -- (learner_milestones.converted_at) or by merging into an existing account.
  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  select p_day, 'derived', 'guest_conversions', 'kind', k.kind, count(*)
  from (
    select 'in_place' as kind from public.learner_milestones p
    where p.converted_at is not null and app.day_of(p.converted_at) = p_day
    union all
    select 'merged' from public.account_merges m
    where app.day_of(m.created_at) = p_day
  ) k
  group by k.kind;
  get diagnostics v_written = row_count; v_rows := v_rows + v_written;

  insert into public.analytics_rollups (day, computed_at, rows_written, duration_ms)
  values (p_day, now(), v_rows,
          (extract(epoch from (clock_timestamp() - v_started)) * 1000)::integer)
  on conflict (day) do update
  set computed_at = excluded.computed_at,
      rows_written = excluded.rows_written,
      duration_ms = excluded.duration_ms;

  return jsonb_build_object(
    'day', p_day,
    'rows_written', v_rows,
    'duration_ms', (extract(epoch from (clock_timestamp() - v_started)) * 1000)::integer
  );
end;
$$;

-- Only a privileged client may compute a rollup. Nobody signed in can,
-- staff included: a report is read, not produced on demand by a person.
revoke execute on function public.rollup_day(date) from public, anon, authenticated;
grant execute on function public.rollup_day(date) to service_role;

-- --------------------------------------------------------- reconciliation --

-- Compares what is stored against a fresh count from the product tables, and
-- the consented event stream against the same. A metric that disagrees is
-- reported rather than quietly corrected.
create or replace function public.reconcile_day(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_row record;
  v_mismatches integer := 0;
begin
  for v_row in
    with expected as (
      select 'cards_completed' as name, count(*)::bigint as n
      from public.content_interactions where app.day_of(completed_at) = p_day
      union all
      select 'cards_saved', count(*)
      from public.content_interactions where app.day_of(saved_at) = p_day
      union all
      select 'cards_skipped', count(*)
      from public.content_interactions where app.day_of(skipped_at) = p_day
      union all
      select 'cards_opened', count(*)
      from public.content_interactions where app.day_of(opened_at) = p_day
      union all
      select 'sessions_started', count(*)
      from public.feed_sessions where app.day_of(started_at) = p_day
      union all
      select 'sessions_completed', count(*)
      from public.feed_sessions where app.day_of(ended_at) = p_day
      union all
      select 'resources_submitted', count(*)
      from public.content_items
      where origin = 'user_submitted' and app.day_of(created_at) = p_day
      union all
      select 'cards_published', count(*)
      from public.content_items where app.day_of(published_at) = p_day
      union all
      select 'guests_created', count(*)
      from auth.users where is_anonymous and app.day_of(created_at) = p_day
      union all
      select 'accounts_registered', count(*)
      from auth.users where not is_anonymous and app.day_of(created_at) = p_day
    ),
    stored as (
      select name, coalesce(sum(count), 0)::bigint as n
      from public.analytics_daily
      where day = p_day and source = 'derived' and dimension = 'all'
      group by name
    )
    select e.name,
           e.n as expected,
           coalesce(s.n, 0) as stored
    from expected e
    left join stored s on s.name = e.name
    order by e.name
  loop
    if v_row.expected <> v_row.stored then
      v_mismatches := v_mismatches + 1;
    end if;

    v_result := v_result || jsonb_build_object(
      'metric', v_row.name,
      'expected', v_row.expected,
      'stored', v_row.stored,
      'matches', v_row.expected = v_row.stored
    );
  end loop;

  return jsonb_build_object(
    'day', p_day,
    'rolled_up', exists (select 1 from public.analytics_rollups where day = p_day),
    'mismatches', v_mismatches,
    'metrics', v_result,
    -- A stored number higher than a fresh count is not necessarily wrong.
    -- Erasure removes the rows a recomputation would count, so a day
    -- recomputed after someone deleted their account legitimately falls.
    -- This is here so that drift can be explained rather than guessed at.
    'erasures_since_rollup', (
      select count(*) from public.audit_log a
      where a.action = 'account.deleted'
        and a.created_at >= coalesce(
          (select r.computed_at from public.analytics_rollups r where r.day = p_day),
          '-infinity'::timestamptz)
    ),
    -- Identified events exist only for people who consented, so this can
    -- never equal the derived count. It is here to show the gap, not to
    -- reconcile against it.
    'consented_events', (
      select count(*) from public.analytics_events
      where app.day_of(occurred_at) = p_day
    )
  );
end;
$$;

revoke execute on function public.reconcile_day(date) from public, anon, authenticated;
grant execute on function public.reconcile_day(date) to service_role;

-- ------------------------------------------------------------------ views --

-- The threshold below which a breakdown row is withheld. Five is the usual
-- floor for published statistics; it is here rather than in the application
-- so it cannot be skipped by querying the table directly.
-- No search_path clause, for the same inlining reason as app.day_of, and
-- safe for the same reason: the body is a constant.
create or replace function app.suppression_threshold()
returns integer
language sql
immutable
as $$ select 5 $$;

-- One row per computed day. A day missing from here was never computed; a
-- day present with zeros genuinely had none.
create or replace view public.analytics_overview
with (security_invoker = true)
as
select
  r.day,
  r.computed_at,
  coalesce(max(d.count) filter (where d.name = 'cards_completed'), 0) as cards_completed,
  coalesce(max(d.count) filter (where d.name = 'cards_saved'), 0) as cards_saved,
  coalesce(max(d.count) filter (where d.name = 'cards_opened'), 0) as cards_opened,
  coalesce(max(d.count) filter (where d.name = 'learners_active'), 0) as learners_active,
  coalesce(max(d.count) filter (where d.name = 'first_completions'), 0) as first_completions,
  coalesce(max(d.count) filter (where d.name = 'returning_learners'), 0) as returning_learners,
  coalesce(max(d.count) filter (where d.name = 'sessions_started'), 0) as sessions_started,
  coalesce(max(d.count) filter (where d.name = 'sessions_completed'), 0) as sessions_completed,
  coalesce(max(d.count) filter (where d.name = 'resources_submitted'), 0) as resources_submitted,
  coalesce(max(d.count) filter (where d.name = 'guests_created'), 0) as guests_created,
  coalesce(max(d.count) filter (where d.name = 'accounts_registered'), 0) as accounts_registered,
  round(
    (max(d.value_sum) filter (where d.name = 'first_completion_seconds'))
    / nullif(max(d.value_count) filter (where d.name = 'first_completion_seconds'), 0), 1
  ) as mean_seconds_to_first_completion,
  max(d.value_count) filter (where d.name = 'first_completion_seconds') as first_completion_timings
from public.analytics_rollups r
left join public.analytics_daily d
  on d.day = r.day and d.source = 'derived' and d.dimension = 'all'
group by r.day, r.computed_at;

comment on view public.analytics_overview is
  'Derived metrics only. Every row is a day that was computed; a missing day was not.';

-- Breakdowns, with small groups withheld. The count is null and suppressed
-- is true rather than the row vanishing, so a reader can see that something
-- is there without seeing how little.
create or replace view public.analytics_breakdown
with (security_invoker = true)
as
select
  d.day,
  d.name,
  d.dimension,
  d.dimension_key,
  case when d.count >= app.suppression_threshold() then d.count end as count,
  d.count < app.suppression_threshold() as suppressed
from public.analytics_daily d
where d.source = 'derived' and d.dimension <> 'all';

comment on view public.analytics_breakdown is
  'Derived breakdowns with groups below the suppression threshold withheld.';

-- Moderation and quality trends, from the catalogue itself rather than from
-- counters that could drift away from it.
create or replace view public.moderation_trends
with (security_invoker = true)
as
select
  app.day_of(c.reviewed_at) as day,
  c.origin::text as origin,
  count(*) filter (where c.status = 'published') as approved,
  count(*) filter (where c.status = 'rejected') as rejected,
  round(avg(c.quality_score) filter (where c.status = 'published'), 1) as mean_quality_published
from public.content_items c
where c.reviewed_at is not null
group by app.day_of(c.reviewed_at), c.origin::text;

-- The time-to-first-win distribution. A median says more than a mean here,
-- because one person who left the tab open for an hour should not move the
-- headline number.
--
-- This one view runs as its owner, because learner_milestones is readable
-- only by the person it describes — staff included. The guard is inside:
-- without app.is_staff() it returns nothing, it returns only aggregates,
-- and it is withheld entirely below the suppression threshold so a median
-- cannot describe two people.
create or replace view public.first_win_timing
with (security_invoker = false)
as
select
  count(*) as timings,
  case when count(*) >= app.suppression_threshold()
    then round(percentile_cont(0.5) within group (order by p.first_completion_seconds)::numeric, 0)
  end as median_seconds,
  case when count(*) >= app.suppression_threshold()
    then round(percentile_cont(0.9) within group (order by p.first_completion_seconds)::numeric, 0)
  end as p90_seconds,
  count(*) < app.suppression_threshold() as suppressed
from public.learner_milestones p
where p.first_completion_seconds is not null
  and app.is_staff();

comment on view public.first_win_timing is
  'Aggregate only, staff only, withheld below the suppression threshold.';

grant select on public.first_win_timing to authenticated;

grant select on public.analytics_overview to authenticated;
grant select on public.analytics_breakdown to authenticated;
grant select on public.moderation_trends to authenticated;

-- The underlying tables remain staff-only through their own policies, and a
-- security_invoker view cannot see more than the person reading it, so none
-- of these expose anything a non-staff account could not already read.

-- ---------------------------------------------------------------- indexes --

-- None. Three were written for this rollup and then removed, because
-- measuring them showed they changed nothing: a day's rollup took 73-77 ms
-- with them and 72-77 ms without, on 80,000 interactions across 60 days.
-- The existing content_interactions_completed_idx already covers the only
-- scan large enough to matter, and feed_sessions is small.
--
-- The real cost was elsewhere and is fixed above: app.day_of could not be
-- inlined while it carried a SET clause, which cost 6.6x (702 ms to 106 ms).
--
-- Re-measure with scripts/measure-analytics-performance.mjs when
-- feed_sessions passes roughly a million rows, and add an index then if the
-- numbers ask for one.

-- --------------------------------------------------- export and erasure --

-- The export has to carry the new table, or it would not be everything we
-- hold. Deletion needs no change: learner_milestones cascades with the
-- account like every other row the person owns.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_export jsonb;
begin
  if v_user is null then
    raise exception 'export_my_data: no session';
  end if;

  select jsonb_build_object(
    'format', 'vshares.export.v1',
    'exported_at', now(),
    'account', (
      select jsonb_build_object(
        'id', u.id, 'email', u.email, 'is_guest', u.is_anonymous, 'created_at', u.created_at
      )
      from auth.users u where u.id = v_user
    ),
    'profile', (
      select to_jsonb(p) - 'user_id' from public.profiles p where p.user_id = v_user
    ),
    'milestones', (
      select to_jsonb(m) - 'user_id' from public.learner_milestones m where m.user_id = v_user
    ),
    'preferences', (
      select to_jsonb(pr) - 'user_id' from public.preferences pr where pr.user_id = v_user
    ),
    'consent_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', c.kind, 'granted', c.granted, 'occurred_at', c.occurred_at
      ) order by c.occurred_at)
      from public.consent_events c where c.user_id = v_user
    ), '[]'::jsonb),
    'roles', coalesce((
      select jsonb_agg(r.role order by r.role)
      from public.user_roles r where r.user_id = v_user
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'topic', t.name, 'declared', ut.declared, 'affinity', ut.affinity, 'level', ut.level
      ) order by t.name)
      from public.user_topics ut
      join public.topics t on t.id = ut.topic_id
      where ut.user_id = v_user
    ), '[]'::jsonb),
    'interactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'card', ci.content_id, 'slug', c.slug,
        'impressions', ci.impressions, 'opened_at', ci.opened_at,
        'completed_at', ci.completed_at, 'saved_at', ci.saved_at,
        'liked_at', ci.liked_at, 'skipped_at', ci.skipped_at,
        'feedback', ci.feedback, 'completed_minutes', ci.completed_minutes
      ) order by ci.created_at)
      from public.content_interactions ci
      join public.content_items c on c.id = ci.content_id
      where ci.user_id = v_user
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'started_at', s.started_at, 'ended_at', s.ended_at, 'size', s.size
      ) order by s.started_at)
      from public.feed_sessions s where s.user_id = v_user
    ), '[]'::jsonb),
    'recommendations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'card', r.content_id, 'surface', r.surface, 'position', r.position,
        'score', r.score, 'components', r.components, 'shown_at', r.shown_at
      ) order by r.shown_at)
      from public.recommendations r where r.user_id = v_user
    ), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'status', c.status, 'source_url', c.source_url,
        'created_at', c.created_at, 'rejection_reason', c.rejection_reason,
        'title', v.title, 'summary', v.summary
      ) order by c.created_at)
      from public.content_items c
      left join public.content_versions v on v.id = c.current_version_id
      where c.submitted_by = v_user
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'card', rp.content_id, 'reason', rp.reason, 'note', rp.note,
        'status', rp.status, 'created_at', rp.created_at
      ) order by rp.created_at)
      from public.content_reports rp where rp.reporter_id = v_user
    ), '[]'::jsonb),
    'analytics_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', e.name, 'occurred_at', e.occurred_at, 'value', e.value
      ) order by e.occurred_at)
      from public.analytics_events e where e.user_id = v_user
    ), '[]'::jsonb),
    'account_merges', coalesce((
      select jsonb_agg(jsonb_build_object('created_at', m.created_at))
      from public.account_merges m where m.target_user_id = v_user
    ), '[]'::jsonb)
  )
  into v_export;

  return v_export;
end;
$$;

-- ------------------------------------------- the superseded M5 view --

-- first_win_metrics was written in Milestone 5, when every row in
-- analytics_daily was reported. It is not any more, and one name —
-- first_completion_seconds — now exists as both a reported event and a
-- derived metric. The view's `max(...) filter (where name = ...)` would take
-- whichever row happened to be larger, mixing a browser's claim with a
-- measurement. Found by reading the two definitions side by side after the
-- derived metric was added.
--
-- It is pinned to the reported rows, which is what it was always counting,
-- and analytics_overview is the one to read.
create or replace view public.first_win_metrics
with (security_invoker = true)
as
select
  d.day,
  max(d.count) filter (where d.name = 'visit_started') as visits,
  max(d.count) filter (where d.name = 'topic_selected') as topics_chosen,
  max(d.count) filter (where d.name = 'card_completed') as completions,
  max(d.count) filter (where d.name = 'account_created') as accounts_created,
  round(
    (max(d.value_sum) filter (where d.name = 'first_completion_seconds'))
    / nullif(max(d.value_count) filter (where d.name = 'first_completion_seconds'), 0),
    1
  ) as mean_seconds_to_first_completion
from public.analytics_daily d
where d.dimension = 'all'
  and d.source = 'reported'
group by d.day;

comment on view public.first_win_metrics is
  'Superseded by analytics_overview. Reported rows only, so it cannot mix a browser''s claim with a measurement.';

grant select on public.first_win_metrics to authenticated;
