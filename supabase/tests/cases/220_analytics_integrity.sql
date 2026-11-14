-- What consent, erasure and repetition do to the numbers.

-- The first-win timer is written once and only by someone who finished.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('timer-mod@example.com');
  v_user := test.create_user('timer-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f5555555-5555-4555-8555-555555555555', 'finance', 'Personal finance', 'Making money work for what matters to you.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f5555555-5555-4555-8555-555555555555', 'budgeting', 'Budgeting');

  perform test.become(v_mod);
  v_card := public.create_card('timer-card', v_topic, 'https://example.com/timer',
    'Example Publisher', 'A card to time',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 5, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- Before completing anything, the timer is refused.
  perform test.become(v_user);
  perform test.equals(public.record_first_completion_seconds(42), false,
    'a browser that has completed nothing cannot report a first-win time');
  perform test.ok(
    not exists (select 1 from public.learner_milestones where user_id = v_user),
    'and nothing is stored');

  perform public.set_interaction(v_card, 'complete');

  perform test.equals(public.record_first_completion_seconds(42), true,
    'after a completion the time is accepted');
  perform test.equals(
    (select first_completion_seconds::int from public.learner_milestones where user_id = v_user), 42,
    'and stored against the account, where only that person can read it');

  -- Replay: the same browser, or another, says something different.
  perform test.equals(public.record_first_completion_seconds(5), false,
    'a second report is ignored rather than overwriting the first');
  perform test.equals(
    (select first_completion_seconds::int from public.learner_milestones where user_id = v_user), 42,
    'the first value stands');

  perform test.refuses(
    'select public.record_first_completion_seconds(-1)',
    'a negative duration is refused');
  perform test.refuses(
    'select public.record_first_completion_seconds(999999)',
    'and so is one longer than a day');

  -- It belongs to the person: it is in their export and goes with them.
  perform test.ok(
    (public.export_my_data() -> 'milestones' ->> 'first_completion_seconds') = '42',
    'the timing appears in the person''s own export');
end;
$$;

-- Guest conversion is dated where it happens.
do $$
declare
  v_guest uuid;
  v_today date;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;

  perform test.become_service();
  v_guest := gen_random_uuid();
  insert into auth.users (id, email, is_anonymous) values (v_guest, null, true);

  perform test.ok(
    not exists (select 1 from public.learner_milestones
                where user_id = v_guest and converted_at is not null),
    'a guest account has no conversion date');

  -- Registering in place: the same account stops being anonymous.
  update auth.users set is_anonymous = false, email = 'converted@example.com'
  where id = v_guest;

  perform test.ok(
    (select converted_at from public.learner_milestones where user_id = v_guest) is not null,
    'converting in place is dated at the moment it happens');

  perform public.rollup_day(v_today);
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'guest_conversions' and dimension_key = 'in_place'), 1,
    'and is counted as a conversion');

  -- Converting again cannot double count.
  update auth.users set is_anonymous = true where id = v_guest;
  update auth.users set is_anonymous = false where id = v_guest;
  perform public.rollup_day(v_today);
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'guest_conversions' and dimension_key = 'in_place'), 1,
    'a second conversion of the same account is not a second conversion');
end;
$$;

-- Withdrawing consent stops identified collection and clears what was held,
-- while the aggregate the product decisions rest on is untouched.
do $$
declare
  v_user uuid;
  v_today date;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;
  v_user := test.create_user('withdraw@example.com');

  perform test.become(v_user);
  update public.preferences set analytics_consent = 'granted' where user_id = v_user;
  perform public.record_event('visit_started');
  perform public.record_event('card_opened');

  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_user), 2,
    'two identified events are held under consent');

  update public.preferences set analytics_consent = 'denied' where user_id = v_user;

  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_user), 0,
    'withdrawing consent clears them without being asked');

  perform public.record_event('card_opened');
  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_user), 0,
    'and no further identified event is written');

  perform test.become_owner();
  perform test.equals(
    (select sum(count)::int from public.analytics_daily
      where day = v_today and source = 'reported' and name = 'card_opened'), 2,
    'the identifier-free aggregate still counted every one of them');
end;
$$;

-- Erasure, and the drift it causes in a recomputed historical day.
--
-- This is the one place a derived number can legitimately disagree with a
-- fresh count: the rows it was computed from are gone. Reconciliation has
-- to say so rather than report tampering.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_today date;
  v_report jsonb;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;

  v_mod := test.create_user('erase-mod@example.com');
  v_user := test.create_user('erase-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f6666666-6666-4666-8666-666666666666', 'comms', 'Communication', 'Saying what you mean so it lands.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f6666666-6666-4666-8666-666666666666', 'writing', 'Writing');

  perform test.become(v_mod);
  v_card := public.create_card('erasure-card', v_topic, 'https://example.com/erase',
    'Example Publisher', 'A card to erase around',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 5, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);
  perform public.set_interaction(v_card, 'complete');

  perform test.become_service();
  perform public.rollup_day(v_today);
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived' and name = 'cards_completed' and dimension = 'all'), 1,
    'the completion is counted on the day it happened');

  -- The person deletes their account.
  perform test.become_recently_authenticated(v_user);
  perform public.delete_my_account('DELETE');

  perform test.become_service();
  v_report := public.reconcile_day(v_today);

  perform test.ok((v_report ->> 'mismatches')::int > 0,
    'recomputing that day after an erasure no longer agrees with what was stored');
  perform test.ok(
    not exists (
      select 1 from jsonb_array_elements(v_report -> 'metrics') m
      where (m ->> 'stored')::int < (m ->> 'expected')::int
    ),
    'every disagreement is in the one direction erasure can cause: stored is never the lower figure');
  perform test.ok((v_report ->> 'erasures_since_rollup')::int >= 1,
    'and reconciliation names erasure as the reason, from the audit log');
  perform test.ok(
    exists (
      select 1 from jsonb_array_elements(v_report -> 'metrics') m
      where m ->> 'metric' = 'cards_completed'
        and (m ->> 'stored')::int > (m ->> 'expected')::int
    ),
    'the stored figure is the higher one, which is what erasure looks like');

  -- The aggregate itself holds no identifier, so the historical count is
  -- left standing rather than rewritten.
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived' and name = 'cards_completed' and dimension = 'all'), 1,
    'and the stored history is not silently rewritten by the erasure');
end;
$$;

-- Sessions that cross midnight are split honestly.
do $$
declare
  v_user uuid;
  v_session uuid;
begin
  perform test.reset();
  v_user := test.create_user('midnight@example.com');

  perform test.become_service();
  v_session := gen_random_uuid();
  insert into public.feed_sessions (id, user_id, size, started_at, ended_at)
  values (v_session, v_user, 7, '2026-03-10T23:50:00Z', '2026-03-11T00:10:00Z');

  perform public.rollup_day('2026-03-10');
  perform public.rollup_day('2026-03-11');

  perform test.equals(
    (select count::int from public.analytics_daily
      where day = '2026-03-10' and source = 'derived' and name = 'sessions_started'), 1,
    'the session is counted as started on the day it began');
  perform test.ok(
    not exists (select 1 from public.analytics_daily
      where day = '2026-03-10' and source = 'derived' and name = 'sessions_completed'),
    'and not as completed on that day');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = '2026-03-11' and source = 'derived' and name = 'sessions_completed'), 1,
    'it is counted as completed on the day it ended');
  perform test.ok(
    not exists (select 1 from public.analytics_daily
      where day = '2026-03-11' and source = 'derived' and name = 'sessions_started'),
    'and not as started on that day: neither day is told it had a whole session');
end;
$$;

-- An abandoned session is never a completed one.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('abandoned@example.com');

  perform test.become_service();
  insert into public.feed_sessions (user_id, size, started_at, ended_at)
  values (v_user, 7, '2026-03-12T10:00:00Z', null);

  perform public.rollup_day('2026-03-12');

  perform test.equals(
    (select count::int from public.analytics_daily
      where day = '2026-03-12' and source = 'derived' and name = 'sessions_started'), 1,
    'an abandoned session counts as started');
  perform test.ok(
    not exists (select 1 from public.analytics_daily
      where day = '2026-03-12' and source = 'derived' and name = 'sessions_completed'),
    'and never as completed, so the completion rate cannot flatter itself');
end;
$$;

-- The first-win timing view: staff only, aggregate only, withheld when it
-- would describe too few people.
do $$
declare
  v_mod uuid;
  v_user uuid;
  i integer;
  v_ids uuid[] := '{}';
begin
  perform test.reset();
  v_mod := test.create_user('timing-mod@example.com');
  v_user := test.create_user('timing-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');

  -- Three people, which is below the threshold of five.
  for i in 1..3 loop
    v_ids := v_ids || test.create_user('t' || i || '@example.com');
  end loop;
  perform test.become_service();
  insert into public.learner_milestones (user_id, first_completion_seconds)
  select unnest(v_ids), 60;

  perform test.become(v_mod);
  perform test.ok(
    (select median_seconds from public.first_win_timing) is null,
    'a median over three people is withheld');
  perform test.equals(
    (select suppressed from public.first_win_timing), true,
    'and the view says it was withheld rather than reporting nothing');

  -- Five people clears it.
  perform test.become_service();
  for i in 4..5 loop
    v_ids := v_ids || test.create_user('t' || i || '@example.com');
  end loop;
  perform test.become_service();
  insert into public.learner_milestones (user_id, first_completion_seconds)
  select unnest(v_ids), 100
  on conflict (user_id) do nothing;

  perform test.become(v_mod);
  -- Three at sixty seconds and two at a hundred: the median is sixty.
  perform test.equals(
    (select median_seconds::int from public.first_win_timing), 60,
    'with five it reports a median');
  perform test.equals(
    (select p90_seconds::int from public.first_win_timing), 100,
    'and a ninetieth percentile, so a slow tail is visible rather than averaged away');
  perform test.equals(
    (select timings::int from public.first_win_timing), 5,
    'and says how many it is based on');

  -- A learner gets nothing at all, even though the view runs as its owner.
  perform test.become(v_user);
  perform test.ok(
    (select median_seconds from public.first_win_timing) is null,
    'a learner reading the view sees no median');
  perform test.equals(
    (select timings::int from public.first_win_timing), 0,
    'and no counts: the guard is inside the view, not around it');
  perform test.equals(
    (select count(*)::int from public.learner_milestones
      where user_id <> app.current_user_id()), 0,
    'and cannot read anyone else''s timing directly, staff or not');
end;
$$;

-- Erasure takes the milestones with it.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('milestone-erase@example.com');

  perform test.become_service();
  insert into public.learner_milestones (user_id, first_completion_seconds, converted_at)
  values (v_user, 90, now());

  perform test.become_recently_authenticated(v_user);
  perform public.delete_my_account('DELETE');

  perform test.become_service();
  perform test.equals(
    (select count(*)::int from public.learner_milestones where user_id = v_user), 0,
    'deleting the account removes the first-win timing and the conversion date');
  perform test.equals(
    (select count(*)::int from public.learner_milestones), 0,
    'and leaves nothing behind pointing at an account that no longer exists');
end;
$$;
