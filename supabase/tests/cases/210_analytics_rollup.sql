-- The derived rollup: can it be trusted, and can it be re-run?
--
-- Everything here goes through the product tables, which is the point:
-- a client that replays an event cannot move any of these numbers.

-- A card, a session and a completion, rolled up.
do $$
declare
  v_mod uuid;
  v_a uuid;
  v_b uuid;
  v_topic uuid;
  v_card uuid;
  v_card2 uuid;
  v_result jsonb;
  v_today date;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;

  v_mod := test.create_user('roll-mod@example.com');
  v_a := test.create_user('roll-a@example.com');
  v_b := test.create_user('roll-b@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f1111111-1111-4111-8111-111111111111', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f1111111-1111-4111-8111-111111111111', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('rollup-card-one', v_topic, 'https://example.com/one',
    'Example Publisher', 'The first card',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 8, 70);
  v_card2 := public.create_card('rollup-card-two', v_topic, 'https://example.com/two',
    'Example Publisher', 'The second card',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform public.record_link_check(v_card2, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');
  perform public.moderate_content(v_card2, 'approve');

  -- Two people do things.
  perform test.become(v_a);
  perform public.set_interaction(v_card, 'open');
  perform public.set_interaction(v_card, 'complete');
  perform public.set_interaction(v_card2, 'save');

  perform test.become(v_b);
  perform public.set_interaction(v_card, 'complete');

  perform test.become_service();
  v_result := public.rollup_day(v_today);

  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'cards_completed' and dimension = 'all'), 2,
    'two completions are counted');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'learners_active' and dimension = 'all'), 2,
    'two distinct people are counted as active learners');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'cards_saved' and dimension = 'all'), 1,
    'one save is counted');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'first_completions' and dimension = 'all'), 2,
    'both completions are first completions');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'cards_completed' and dimension = 'topic' and dimension_key = 'focus'), 2,
    'the topic breakdown agrees with the total');
  perform test.ok(
    not exists (select 1 from public.analytics_daily
      where day = v_today and source = 'derived' and name = 'returning_learners'),
    'nobody is a returning learner on their first day');

  -- Re-running changes nothing. This is what makes the numbers safe to
  -- recompute after a fix, and what protects them from replay.
  perform public.rollup_day(v_today);
  perform public.rollup_day(v_today);

  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'cards_completed' and dimension = 'all'), 2,
    'running the rollup three times still counts two completions');
  perform test.equals(
    (select count(*)::int from public.analytics_rollups where day = v_today), 1,
    'and the day is recorded once, not three times');
end;
$$;

-- Replaying a reported event cannot touch a derived number.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_today date;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;

  v_mod := test.create_user('replay-mod@example.com');
  v_user := test.create_user('replay-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f2222222-2222-4222-8222-222222222222', 'career', 'Career', 'Work that goes somewhere worth going.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f2222222-2222-4222-8222-222222222222', 'interviews', 'Interviews');

  perform test.become(v_mod);
  v_card := public.create_card('replay-card', v_topic, 'https://example.com/replay',
    'Example Publisher', 'A card to replay against',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 5, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);
  perform public.set_interaction(v_card, 'complete');

  -- Completing again is not a second completion.
  perform public.set_interaction(v_card, 'complete');
  perform public.set_interaction(v_card, 'complete');

  -- And the browser shouts the event twenty times.
  for i in 1..20 loop
    perform public.record_event('card_completed');
  end loop;

  perform test.become_service();
  perform public.rollup_day(v_today);

  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'derived'
        and name = 'cards_completed' and dimension = 'all'), 1,
    'the derived count is one completion, however often it was announced');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_today and source = 'reported' and name = 'card_completed'), 20,
    'the reported count faithfully records that it was announced twenty times');
  perform test.ok(
    (select count(*) from public.analytics_daily
      where day = v_today and source = 'reported') > 0
    and (select count(*) from public.analytics_daily
      where day = v_today and source = 'derived') > 0,
    'the two are stored separately and never merged');
end;
$$;

-- Reconciliation reports agreement, and disagreement.
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

  v_mod := test.create_user('rec-mod@example.com');
  v_user := test.create_user('rec-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f3333333-3333-4333-8333-333333333333', 'health', 'Health', 'Looking after the body you think with.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f3333333-3333-4333-8333-333333333333', 'sleep', 'Sleep');

  perform test.become(v_mod);
  v_card := public.create_card('reconcile-card', v_topic, 'https://example.com/rec',
    'Example Publisher', 'A card to reconcile',
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

  -- Before any rollup, reconciliation says so rather than reporting zero.
  v_report := public.reconcile_day(v_today);
  perform test.equals((v_report ->> 'rolled_up')::boolean, false,
    'reconciliation says when a day has never been computed');
  perform test.ok((v_report ->> 'mismatches')::int > 0,
    'and an uncomputed day does not pretend to agree');

  perform public.rollup_day(v_today);
  v_report := public.reconcile_day(v_today);

  perform test.equals((v_report ->> 'mismatches')::int, 0,
    'after a rollup every derived metric reconciles exactly');
  perform test.equals((v_report ->> 'rolled_up')::boolean, true,
    'and the day is marked as computed');

  -- Tamper with a stored number and reconciliation must catch it.
  update public.analytics_daily set count = count + 7
  where day = v_today and source = 'derived' and name = 'cards_completed' and dimension = 'all';

  v_report := public.reconcile_day(v_today);
  perform test.equals((v_report ->> 'mismatches')::int, 1,
    'a tampered count is reported as a mismatch, not silently corrected');

  -- Recomputing fixes it, which is the whole reason the rollup is derived.
  perform public.rollup_day(v_today);
  perform test.equals((public.reconcile_day(v_today) ->> 'mismatches')::int, 0,
    'and recomputing restores agreement');
end;
$$;

-- The reporting day is UTC and does not follow the session's time zone.
do $$
declare
  v_mod uuid;
  v_late uuid;
  v_early uuid;
  v_topic uuid;
  v_card uuid;
  v_day date := '2026-06-15';
begin
  perform test.reset();

  v_mod := test.create_user('tz-mod@example.com');
  v_late := test.create_user('tz-late@example.com');
  v_early := test.create_user('tz-early@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f4444444-4444-4444-8444-444444444444', 'learning', 'Learning', 'Getting better at getting better.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f4444444-4444-4444-8444-444444444444', 'memory', 'Memory');

  perform test.become(v_mod);
  v_card := public.create_card('timezone-card', v_topic, 'https://example.com/tz',
    'Example Publisher', 'A card across midnight',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 5, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_late);
  perform public.set_interaction(v_card, 'complete');
  perform test.become(v_early);
  perform public.set_interaction(v_card, 'complete');

  perform test.become_service();
  -- 23:30 UTC on the 15th, and 00:30 UTC on the 16th.
  update public.content_interactions set completed_at = '2026-06-15T23:30:00Z'
  where user_id = v_late;
  update public.content_interactions set completed_at = '2026-06-16T00:30:00Z'
  where user_id = v_early;

  -- Read the day through a session set to a zone well away from UTC.
  set local time zone 'Pacific/Auckland';
  perform public.rollup_day(v_day);
  perform public.rollup_day(v_day + 1);

  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_day and source = 'derived' and name = 'cards_completed' and dimension = 'all'), 1,
    'a completion at 23:30 UTC belongs to that UTC day, whatever the session time zone');
  perform test.equals(
    (select count::int from public.analytics_daily
      where day = v_day + 1 and source = 'derived' and name = 'cards_completed' and dimension = 'all'), 1,
    'and one at 00:30 UTC belongs to the next');

  set local time zone 'UTC';
end;
$$;

-- Missing data reads as missing, not as zero.
do $$
declare
  v_day date := '2026-05-01';
begin
  perform test.reset();
  perform test.become_service();

  perform test.ok(
    not exists (select 1 from public.analytics_overview where day = v_day),
    'a day nobody computed does not appear in the overview at all');

  perform public.rollup_day(v_day);

  perform test.equals(
    (select cards_completed::int from public.analytics_overview where day = v_day), 0,
    'a day that was computed and had nothing reads as a genuine zero');
  perform test.ok(
    (select computed_at from public.analytics_overview where day = v_day) is not null,
    'and carries the time it was computed, so the zero can be trusted');
  perform test.ok(
    (select mean_seconds_to_first_completion from public.analytics_overview where day = v_day) is null,
    'a mean with nothing to average is null, never zero');
end;
$$;

-- A future day is refused.
do $$
begin
  perform test.reset();
  perform test.become_service();
  perform test.refuses(
    'select public.rollup_day((now() at time zone ''UTC'')::date + 1)',
    'a day that has not happened cannot be rolled up');
end;
$$;

-- Small groups are withheld from breakdowns.
do $$
declare
  v_today date;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;
  perform test.become_service();

  insert into public.analytics_daily (day, source, name, dimension, dimension_key, count)
  values
    (v_today, 'derived', 'cards_completed', 'topic', 'rare-topic', 2),
    (v_today, 'derived', 'cards_completed', 'topic', 'common-topic', 40);

  perform test.equals(
    (select count from public.analytics_breakdown
      where dimension_key = 'common-topic')::int, 40,
    'a group above the threshold is reported');
  perform test.ok(
    (select count from public.analytics_breakdown where dimension_key = 'rare-topic') is null,
    'a group of two is withheld');
  perform test.equals(
    (select suppressed from public.analytics_breakdown where dimension_key = 'rare-topic'), true,
    'and is marked suppressed rather than disappearing, so the reader knows something is there');
end;
$$;

-- Who may compute, reconcile and read.
do $$
declare
  v_user uuid;
  v_mod uuid;
  v_today date;
begin
  perform test.reset();
  v_today := (now() at time zone 'UTC')::date;
  v_user := test.create_user('acl-user@example.com');
  v_mod := test.create_user('acl-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  perform public.rollup_day(v_today);

  perform test.become(v_user);
  perform test.refuses(
    'select public.rollup_day((now() at time zone ''UTC'')::date)',
    'a learner cannot compute a rollup');
  perform test.refuses(
    'select public.reconcile_day((now() at time zone ''UTC'')::date)',
    'a learner cannot reconcile');
  perform test.equals(
    (select count(*)::int from public.analytics_overview), 0,
    'a learner sees no aggregate rows at all');
  perform test.equals(
    (select count(*)::int from public.analytics_rollups), 0,
    'nor which days have been computed');

  perform test.become(v_mod);
  perform test.ok(
    (select count(*) from public.analytics_overview) >= 1,
    'staff can read the aggregate overview');
  perform test.refuses(
    'select public.rollup_day((now() at time zone ''UTC'')::date)',
    'but staff still cannot compute one: that is a privileged job');
  perform test.equals(
    (select count(*)::int from public.analytics_events), 0,
    'and staff still cannot read one person''s events');
end;
$$;
