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
  -- Delivered: how many items the session recommended.
  content_count integer not null default 0,
  -- Engaged: how many of those the person actually opened/completed/saved/
  -- skipped in the session window. Lets analytics tell a partial-session
  -- review (engaged_count < content_count) from a full seven-piece one
  -- (engaged_count = content_count = the session size).
  engaged_count integer not null default 0,
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

-- Security fix (SECURITY DEFINER review, 2026-11-17). app.apply_affinity takes
-- a user id as a parameter and trusts it, so if a client could call it
-- directly it could write to ANOTHER account's affinity. It is an internal
-- helper, called only by set_interaction (a security-definer function that
-- runs as the owner and passes the authenticated caller's own id), so no
-- client needs to execute it. PostgreSQL grants EXECUTE to PUBLIC by default,
-- which was never revoked; this closes that. It is placed in this pending
-- migration (not the applied feed migration) so no applied migration is
-- rewritten. Internal callers are unaffected: a security-definer function
-- executes as its owner, which retains EXECUTE.
revoke execute on function app.apply_affinity(uuid, uuid, numeric, numeric)
  from public, anon, authenticated;

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
  v_started timestamptz;
  v_ended_at timestamptz;
  v_engaged integer;
begin
  if v_user is null then
    raise exception 'record_session_review: no session';
  end if;

  -- Serialise all of this user's reviews. The format-preference recompute
  -- below rewrites the whole user_format_affinity set, so two concurrent
  -- reviews for the same person must not interleave their delete/insert. A
  -- transaction-scoped advisory lock, keyed on the user, makes the second
  -- call wait for the first to commit and then recompute over its result —
  -- consistent without locking anyone else out. (Requirement: concurrency.)
  perform pg_advisory_xact_lock(hashtext('vshares.session_review'), hashtext(v_user::text));

  -- Ownership and the session window.
  select started_at, ended_at into v_started, v_ended_at
  from public.feed_sessions
  where id = p_session_id and user_id = v_user;

  if v_started is null then
    raise exception 'record_session_review: not your session';
  end if;

  -- The session must have finished through the lifecycle...
  if v_ended_at is null then
    raise exception 'record_session_review: the session is not complete';
  end if;

  -- ...and the person must actually have gone through it. ended_at alone is
  -- NOT proof: end_feed_session sets ended_at even for a session abandoned
  -- with no engagement. So eligibility is verified from authoritative records
  -- — the count of cards recommended IN THIS SESSION that the person opened,
  -- completed, saved or skipped, where that specific interaction timestamp
  -- falls WITHIN the session window [started_at, ended_at] inclusive.
  --
  -- Each of the four event timestamps is tested on its own, with `between`,
  -- so neither bound can be dodged: an interaction before the session started
  -- (an earlier session's completion) is excluded by the lower bound, and one
  -- after the session ended is excluded by the upper bound. `greatest()` is
  -- deliberately NOT used — it would collapse the four events to the latest,
  -- letting a later out-of-window action stand in for, or mask, a valid
  -- in-window one. A card counts if ANY of its four timestamps is in window.
  --
  -- This invents no completion record; it reads interactions that already
  -- exist. Early abandonment still qualifies — one engaged item is enough —
  -- so progress is never lost and a genuinely poor session can still be rated
  -- "not useful".
  select count(*) into v_engaged
  from public.recommendations r
  join public.content_interactions ci
    on ci.user_id = v_user and ci.content_id = r.content_id
  where r.session_id = p_session_id
    and (
      ci.opened_at    between v_started and v_ended_at or
      ci.completed_at between v_started and v_ended_at or
      ci.saved_at     between v_started and v_ended_at or
      ci.skipped_at   between v_started and v_ended_at
    );

  if v_engaged = 0 then
    raise exception 'record_session_review: no items from this session were engaged with';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'record_session_review: rating must be 1 to 5';
  end if;

  -- The items shown, from the recommendation log for this session.
  select count(*) into v_count
  from public.recommendations where session_id = p_session_id;

  insert into public.session_reviews (
    session_id, user_id, useful, rating, rating_scale, preferred_format, note,
    content_count, engaged_count
  )
  values (
    p_session_id, v_user, p_useful, p_rating, 5, p_preferred_format, p_note,
    v_count, v_engaged
  )
  on conflict (session_id) do update
  set useful = excluded.useful,
      rating = excluded.rating,
      preferred_format = excluded.preferred_format,
      note = excluded.note,
      content_count = excluded.content_count,
      engaged_count = excluded.engaged_count,
      created_at = now();

  -- Format preference is RECOMPUTED from the person's reviews, not nudged per
  -- call. This makes feedback idempotent — resubmitting the same review
  -- leaves the counts, and therefore the affinities, unchanged — and makes an
  -- edit correct: changing a review's preferred format moves exactly one
  -- observation from the old format to the new. The value is the same gradual
  -- curve as before (a 0.20-rate approach to 1.0 from a 0.300 baseline, which
  -- after n reviews choosing a format is 1 - 0.7 * 0.8^n), now derived from
  -- the count rather than accumulated, so it cannot be inflated by repetition.
  delete from public.user_format_affinity where user_id = v_user;

  insert into public.user_format_affinity (user_id, format, affinity, observations)
  select v_user, sr.preferred_format,
         round(1.0 - 0.7 * power(0.8, count(*)), 3),
         count(*)::integer
  from public.session_reviews sr
  where sr.user_id = v_user and sr.preferred_format is not null
  group by sr.preferred_format;

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
        'note', sr.note, 'content_count', sr.content_count,
        'engaged_count', sr.engaged_count, 'created_at', sr.created_at
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
