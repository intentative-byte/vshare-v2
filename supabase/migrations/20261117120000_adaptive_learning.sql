-- Adaptive learning: session-end feedback, format preference and confidence.
--
-- Additive only. It does not alter a single existing column or policy; it
-- adds one column, two tables, one function, extends two functions, and adds
-- ranking configuration version 2. The seven-piece session, the admission
-- layer, the explanation system and all 395 existing assertions are
-- untouched. Nothing here publishes or admits content: the feedback loop
-- feeds personalisation only (requirement 10).

-- ---------------------------------------------------------- confidence --

-- How many evidence events a topic affinity was built from. Lets the ranker
-- trust a well-evidenced affinity more than a one-action guess, and lets the
-- profile update gradually with confidence (requirement 3).
alter table public.user_topics
  add column observations integer not null default 0 check (observations >= 0);

comment on column public.user_topics.observations is
  'Count of evidence events behind this affinity. Confidence = observations/(observations+K).';

-- ------------------------------------------------ learned format preference --

-- A person's learned preference for a content format, nudged up when they say
-- they want more of it. Never excludes other formats (requirement 4): it is a
-- small ranking signal, not a filter.
create table public.user_format_affinity (
  user_id uuid not null references auth.users (id) on delete cascade,
  format public.content_format not null,
  affinity numeric(4, 3) not null default 0.300 check (affinity >= 0 and affinity <= 1),
  observations integer not null default 0 check (observations >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, format)
);

comment on table public.user_format_affinity is
  'Learned per-format preference. A small ranker signal, never a filter.';

alter table public.user_format_affinity enable row level security;

create policy user_format_affinity_select_own
on public.user_format_affinity for select
to authenticated
using (user_id = app.current_user_id());

-- No write policy: only record_session_review (security definer) writes it, so
-- a client cannot inflate its own preference directly.
grant select on public.user_format_affinity to authenticated;

-- -------------------------------------------------------- session reviews --

-- One review per seven-piece session: was it useful, a 1-5 rating, an optional
-- preferred format and an optional note (requirement 1). The review is linked
-- to the session, whose `recommendations` rows ARE the seven items shown and
-- whose interactions are already recorded, so the feedback is associated with
-- the content actually presented (requirement 2) with no new linkage table.
create table public.session_reviews (
  session_id uuid primary key references public.feed_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Session satisfaction. Kept separate from content quality, engagement and
  -- demonstrated learning (requirement 5): this is how the session felt, not
  -- what anyone learned.
  useful boolean,
  rating smallint check (rating is null or (rating between 1 and 5)),
  rating_scale smallint not null default 5,
  preferred_format public.content_format,
  note text check (note is null or char_length(note) <= 1000),
  content_count integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.session_reviews is
  'Session satisfaction and preferences. Never a measure of learning or mastery.';

alter table public.session_reviews enable row level security;

create policy session_reviews_select_own
on public.session_reviews for select
to authenticated
using (user_id = app.current_user_id());

-- Server-write-only through record_session_review.
grant select on public.session_reviews to authenticated;

-- ------------------------------------------ apply_affinity + observations --

-- Redefined to also count the evidence (observations), so confidence grows
-- with real actions. The affinity maths is unchanged.
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

  insert into public.user_topics (user_id, topic_id, declared, affinity, observations)
  values (p_user, v_topic, false, round(0.200 + (p_target - 0.200) * p_rate, 3), 1)
  on conflict (user_id, topic_id) do update
  set affinity = round(
        public.user_topics.affinity + (p_target - public.user_topics.affinity) * p_rate, 3
      ),
      observations = public.user_topics.observations + 1;
end;
$$;

-- ---------------------------------------------------- record_session_review --

-- Records a session's feedback and gently nudges the learned format
-- preference. Optional in every part: a null review is a skip and changes
-- nothing (requirement 8, acceptance: skip without losing progress). It can
-- never publish or admit content (requirement 10).
create or replace function public.record_session_review(
  p_session_id uuid,
  p_useful boolean default null,
  p_rating smallint default null,
  p_preferred_format public.content_format default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_count integer;
begin
  if v_user is null then
    raise exception 'record_session_review: no session';
  end if;

  if not exists (
    select 1 from public.feed_sessions
    where id = p_session_id and user_id = v_user
  ) then
    raise exception 'record_session_review: not your session';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'record_session_review: rating must be 1 to 5';
  end if;

  -- The seven items shown, from the recommendation log for this session.
  select count(*) into v_count
  from public.recommendations where session_id = p_session_id;

  insert into public.session_reviews (
    session_id, user_id, useful, rating, rating_scale, preferred_format, note, content_count
  )
  values (
    p_session_id, v_user, p_useful, p_rating, 5, p_preferred_format, p_note, v_count
  )
  on conflict (session_id) do update
  set useful = excluded.useful,
      rating = excluded.rating,
      preferred_format = excluded.preferred_format,
      note = excluded.note,
      content_count = excluded.content_count,
      created_at = now();

  -- Nudge the chosen format up, gradually, without touching the others, so a
  -- preference rises without ever excluding other formats (requirement 4).
  if p_preferred_format is not null then
    insert into public.user_format_affinity (user_id, format, affinity, observations)
    values (v_user, p_preferred_format, round(0.300 + (1.0 - 0.300) * 0.20, 3), 1)
    on conflict (user_id, format) do update
    set affinity = round(
          public.user_format_affinity.affinity
          + (1.0 - public.user_format_affinity.affinity) * 0.20, 3
        ),
        observations = public.user_format_affinity.observations + 1,
        updated_at = now();
  end if;

  -- Auditable that a review happened, with no personal content in the trail
  -- (the rating/format/note are personal and stay in the owner-only table).
  perform app.audit('session.review', 'feed_session', p_session_id::text, '{}'::jsonb);

  return jsonb_build_object('recorded', true, 'content_count', v_count);
end;
$$;

grant execute on function public.record_session_review(uuid, boolean, smallint, public.content_format, text)
to authenticated;

-- ------------------------------------------------------ export extension --

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
    'session_reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'session_id', sr.session_id, 'useful', sr.useful, 'rating', sr.rating,
        'rating_scale', sr.rating_scale, 'preferred_format', sr.preferred_format,
        'note', sr.note, 'content_count', sr.content_count, 'created_at', sr.created_at
      ) order by sr.created_at)
      from public.session_reviews sr where sr.user_id = v_user
    ), '[]'::jsonb),
    'format_preferences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'format', fa.format, 'affinity', fa.affinity, 'observations', fa.observations
      ) order by fa.format)
      from public.user_format_affinity fa where fa.user_id = v_user
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

-- --------------------------------------------- ranking configuration v2 --

-- Version 2 adds a small formatFit weight and a confidence parameter. The
-- weights still sum to 1.00; formatFit's 0.04 is taken from engagementQuality
-- (0.10 -> 0.08) and timeFit (0.05 -> 0.03), so interest and quality still
-- dominate and popularity is still never decisive. confidenceK scales learned
-- affinity by observations/(observations+K), so a weak inference stays weak
-- and explicit choice leads (requirement 3, 6).
update public.ranking_configs set is_active = false where version = 1;

insert into public.ranking_configs (version, weights, params, is_active, note)
values (
  2,
  jsonb_build_object(
    'declaredInterest', 0.30,
    'learnedAffinity', 0.20,
    'quality', 0.20,
    'levelFit', 0.10,
    'engagementQuality', 0.08,
    'freshness', 0.05,
    'timeFit', 0.03,
    'formatFit', 0.04
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
    'levelStepUpCompletions', 5,
    'confidenceK', 8
  ),
  true,
  'Adds formatFit and confidence scaling; weights still sum to 1.00. See the adaptive learning audit.'
);
