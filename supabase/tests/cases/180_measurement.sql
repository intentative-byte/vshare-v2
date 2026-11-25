-- Measurement, and what consent changes about it.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('metrics@example.com');

  -- A visitor with no session at all still contributes to the aggregate.
  perform test.become_anonymous();
  perform public.record_event('visit_started');

  perform test.become_owner();
  perform test.equals(
    (select count::int from public.analytics_daily
      where name = 'visit_started' and day = current_date), 1,
    'an aggregate count is recorded for a signed-out visitor');
  perform test.equals(
    (select count(*)::int from public.analytics_events), 0,
    'and nothing identifying them is stored');

  -- A signed-in account that has not granted consent is the same.
  perform test.become(v_user);
  perform public.record_event('card_completed');

  perform test.become_owner();
  perform test.equals(
    (select count::int from public.analytics_daily where name = 'card_completed'), 1,
    'the aggregate counts the completion');
  perform test.equals(
    (select count(*)::int from public.analytics_events), 0,
    'but no identified event is written without consent');
end;
$$;

-- With consent granted, the identified record appears.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('consenting@example.com');

  perform test.become(v_user);
  update public.preferences set analytics_consent = 'granted' where user_id = v_user;
  perform public.record_event('card_completed');

  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_user), 1,
    'an identified event is written once consent is granted');

  -- The aggregate is staff-only, so it is read from outside the viewer's
  -- session.
  perform test.become_owner();
  perform test.equals(
    (select count::int from public.analytics_daily where name = 'card_completed'), 1,
    'and the aggregate still counts it exactly once');
end;
$$;

-- Withdrawing consent removes what was collected under it.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('withdrawing@example.com');

  perform test.become(v_user);
  update public.preferences set analytics_consent = 'granted' where user_id = v_user;
  perform public.record_event('card_completed');
  perform public.record_event('card_saved');

  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_user), 2,
    'two events were collected');

  update public.preferences set analytics_consent = 'denied' where user_id = v_user;

  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_user), 0,
    'withdrawing consent deletes them, without being asked');
  perform test.become_owner();
  perform test.ok(
    (select count from public.analytics_daily where name = 'card_completed') >= 1,
    'the aggregate, which never identified anyone, is unaffected');
end;
$$;

-- Events are private to the person they belong to, and the vocabulary is closed.
do $$
declare
  v_a uuid;
  v_b uuid;
  v_mod uuid;
begin
  perform test.reset();
  v_a := test.create_user('events-a@example.com');
  v_b := test.create_user('events-b@example.com');
  v_mod := test.create_user('events-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');

  perform test.become(v_a);
  update public.preferences set analytics_consent = 'granted' where user_id = v_a;
  perform public.record_event('card_completed');

  perform test.become(v_b);
  perform test.equals(
    (select count(*)::int from public.analytics_events), 0,
    'another account cannot read someone''s events');

  -- Not even staff: the aggregate is what product questions are answered from.
  perform test.become(v_mod);
  perform test.equals(
    (select count(*)::int from public.analytics_events), 0,
    'staff cannot read individual events either');
  perform test.ok(
    (select count(*) from public.analytics_daily) > 0,
    'staff can read the aggregates');

  perform test.become(v_a);
  perform test.refuses(
    'select public.record_event(''made_up_metric'')',
    'an event name nobody defined is refused');

  -- The person can clear their own record at any time.
  perform test.equals(public.forget_my_events(), 1, 'a person can delete their own events');
  perform test.equals(
    (select count(*)::int from public.analytics_events where user_id = v_a), 0,
    'and they are gone');
end;
$$;

-- The first-win funnel reads from aggregates only.
do $$
declare
  v_mod uuid;
begin
  perform test.reset();
  v_mod := test.create_user('funnel-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');

  perform test.become_anonymous();
  perform public.record_event('visit_started');
  perform public.record_event('visit_started');
  perform public.record_event('topic_selected', 'topic', 'Budgeting');
  perform public.record_event('card_completed');
  perform public.record_event('first_completion_seconds', 'all', 'all', 48);
  perform public.record_event('first_completion_seconds', 'all', 'all', 72);

  perform test.become(v_mod);

  perform test.equals(
    (select visits::int from public.first_win_metrics where day = current_date), 2,
    'visits are counted');
  perform test.equals(
    (select completions::int from public.first_win_metrics where day = current_date), 1,
    'completions are counted');
  perform test.equals(
    (select mean_seconds_to_first_completion from public.first_win_metrics where day = current_date),
    60.0,
    'the mean time to a first completion is computed from real measurements');
end;
$$;
