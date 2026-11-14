-- Measurement, built consent-first.
--
-- Two stores, deliberately separate:
--
--   analytics_daily   Aggregate counts with no identifier of any kind. A row
--                     says "on this day, this many people did this". It
--                     cannot be traced to a person, so it is recorded for
--                     everyone, including a visitor who has consented to
--                     nothing.
--
--   analytics_events  Individual events tied to an account. Written only
--                     when that account has actively granted consent.
--
-- The split is the point: we can answer "is the first learning win working"
-- without holding anything about anyone who has not agreed to it.

create table public.analytics_daily (
  day date not null,
  name text not null check (char_length(name) between 3 and 40),
  -- A coarse dimension, never an identifier: a topic slug, a device class,
  -- an acquisition source. Never a user, session or address.
  dimension text not null default 'all' check (char_length(dimension) <= 30),
  dimension_key text not null default 'all' check (char_length(dimension_key) <= 60),
  count bigint not null default 0,
  -- For events that carry a measurement, such as seconds to a first
  -- completion. Sum and count together give a mean.
  value_sum numeric not null default 0,
  value_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, name, dimension, dimension_key)
);

comment on table public.analytics_daily is
  'Aggregate counts only. No identifiers, ever. Safe to record before consent.';

create table public.analytics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  name text not null check (char_length(name) between 3 and 40),
  -- Null once the account is deleted: the event becomes anonymous rather
  -- than disappearing, so historical counts stay correct.
  user_id uuid references auth.users (id) on delete set null,
  session_id uuid,
  content_id uuid references public.content_items (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  value numeric,
  created_at timestamptz not null default now()
);

create index analytics_events_recent_idx on public.analytics_events (occurred_at desc);
create index analytics_events_name_idx on public.analytics_events (name, occurred_at desc);

-- The vocabulary. An event not on this list is refused, so a typo cannot
-- quietly create a metric nobody defined.
create or replace function app.is_known_event(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_name in (
    'visit_started',
    'topic_selected',
    'first_card_shown',
    'card_opened',
    'card_completed',
    'card_saved',
    'card_skipped',
    'first_completion_seconds',
    'session_completed',
    'account_created',
    'return_visit_with_completion'
  );
$$;

-- Records an event.
--
-- The aggregate is always updated. The identified row is written only if
-- the viewer has granted consent — which is checked here, in the database,
-- rather than trusted from the caller.
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

  insert into public.analytics_daily (day, name, dimension, dimension_key, count, value_sum, value_count)
  values (
    current_date, p_name, coalesce(p_dimension, 'all'), coalesce(p_dimension_key, 'all'),
    1, coalesce(p_value, 0), case when p_value is null then 0 else 1 end
  )
  on conflict (day, name, dimension, dimension_key) do update
  set count = public.analytics_daily.count + 1,
      value_sum = public.analytics_daily.value_sum + coalesce(excluded.value_sum, 0),
      value_count = public.analytics_daily.value_count + excluded.value_count,
      updated_at = now();

  if v_user is null then
    return;
  end if;

  select analytics_consent into v_consent from public.preferences where user_id = v_user;

  -- No consent, no identified record. The aggregate above already answered
  -- the product question without it.
  if v_consent is distinct from 'granted' then
    return;
  end if;

  insert into public.analytics_events (name, user_id, session_id, content_id, topic_id, value)
  values (p_name, v_user, p_session_id, p_content_id, p_topic_id, p_value);
end;
$$;

-- Withdrawing consent removes what was collected under it.
create or replace function public.forget_my_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'forget_my_events: no session';
  end if;

  delete from public.analytics_events where user_id = v_user;
  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

-- Clears identified events automatically when consent is withdrawn, so the
-- person does not have to know to ask.
create or replace function app.forget_events_on_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.analytics_consent = 'granted' and new.analytics_consent is distinct from 'granted' then
    delete from public.analytics_events where user_id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger preferences_forget_events
after update on public.preferences
for each row execute function app.forget_events_on_withdrawal();

-- ---------------------------------------------------------- row security --

alter table public.analytics_daily enable row level security;
alter table public.analytics_events enable row level security;

-- Aggregates are readable by staff for product decisions. They hold no
-- personal data, but there is no reason to make them public either.
create policy analytics_daily_select_staff
on public.analytics_daily for select
to authenticated
using (app.is_staff());

-- A person can read their own events, which is what makes an export
-- complete. Staff cannot read individual events at all.
create policy analytics_events_select_own
on public.analytics_events for select
to authenticated
using (user_id = app.current_user_id());

create policy analytics_events_delete_own
on public.analytics_events for delete
to authenticated
using (user_id = app.current_user_id());

grant select on public.analytics_daily to authenticated;
grant select, delete on public.analytics_events to authenticated;
grant execute on function public.record_event(text, text, text, numeric, uuid, uuid, uuid)
to authenticated, anon;
grant execute on function public.forget_my_events() to authenticated;

-- ------------------------------------------------- first-win helper view --

-- The product benchmark: how long it takes someone to finish their first
-- useful thing. Reported from the aggregate, so it works without consent.
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
group by d.day;

grant select on public.first_win_metrics to authenticated;
