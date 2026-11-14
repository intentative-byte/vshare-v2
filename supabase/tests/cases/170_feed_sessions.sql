-- Preference memory, sessions and their summaries.
do $$
declare
  v_user uuid;
  v_topic_a uuid;
  v_topic_b uuid;
begin
  perform test.reset();
  v_user := test.create_user('pref-user@example.com');

  perform test.become_service();
  insert into public.categories (id, slug, name, description)
  values ('a1111111-1111-4111-8111-111111111111', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic_a := gen_random_uuid();
  v_topic_b := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name) values
    (v_topic_a, 'a1111111-1111-4111-8111-111111111111', 'focus', 'Focus'),
    (v_topic_b, 'a1111111-1111-4111-8111-111111111111', 'habits', 'Habits');

  perform test.become(v_user);
  perform public.set_declared_topics(array[v_topic_a, v_topic_b]);

  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_user and declared), 2,
    'both chosen topics are recorded');
  perform test.equals(
    (select affinity from public.user_topics where user_id = v_user and topic_id = v_topic_a),
    0.500,
    'a chosen topic starts at the middle');

  -- Unticking a topic stops it being declared.
  perform public.set_declared_topics(array[v_topic_a]);
  perform test.equals(
    (select declared from public.user_topics where user_id = v_user and topic_id = v_topic_b),
    false,
    'an unticked topic is no longer declared');

  -- The person can set their own level, and say so.
  perform public.set_topic_level(v_topic_a, 'advanced');
  perform test.equals(
    (select level from public.user_topics where user_id = v_user and topic_id = v_topic_a),
    'advanced'::public.content_level,
    'a chosen level is stored');
  perform test.equals(
    (select level_overridden from public.user_topics where user_id = v_user and topic_id = v_topic_a),
    true,
    'and marked as the person''s own choice');

  -- Affinity cannot be edited directly, so the feed cannot be gamed.
  perform test.refuses(
    format('update public.user_topics set affinity = 1 where user_id = %L', v_user),
    'affinity cannot be written directly');
end;
$$;

-- Interactions move affinity, and a reset puts it back.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_before numeric;
  v_after numeric;
begin
  perform test.reset();
  v_mod := test.create_user('aff-mod@example.com');
  v_user := test.create_user('aff-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('a2222222-2222-4222-8222-222222222222', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'a2222222-2222-4222-8222-222222222222', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('affinity-test-card', v_topic, 'https://example.com/aff',
    'Example Publisher', 'A card used to test affinity',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);
  perform public.set_declared_topics(array[v_topic]);

  select affinity into v_before from public.user_topics
  where user_id = v_user and topic_id = v_topic;

  perform public.set_interaction(v_card, 'complete');

  select affinity into v_after from public.user_topics
  where user_id = v_user and topic_id = v_topic;

  perform test.ok(v_after > v_before, 'completing something raises affinity for its topic');
  perform test.ok(v_after < 1.0, 'one action does not swing it to the maximum');

  -- A reset returns it to the starting point for a chosen topic.
  perform public.reset_learned_preferences('affinities');
  perform test.equals(
    (select affinity from public.user_topics where user_id = v_user and topic_id = v_topic),
    0.500,
    'resetting affinities returns a chosen topic to the middle');

  -- Resetting history clears what has been seen, not what was completed.
  perform public.set_interaction(v_card, 'skip', true);
  perform public.reset_learned_preferences('history');
  perform test.equals(
    (select skipped_at from public.content_interactions
      where user_id = v_user and content_id = v_card), null,
    'resetting history clears skips');
  perform test.ok(
    (select completed_at from public.content_interactions
      where user_id = v_user and content_id = v_card) is not null,
    'but keeps what was actually completed');

  perform test.refuses(
    'select public.reset_learned_preferences(''everything'')',
    'an unknown reset scope is refused');
end;
$$;

-- A session is the person's own, and its summary counts only what they
-- finished inside it.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_other uuid;
  v_topic uuid;
  v_card_a uuid;
  v_card_b uuid;
  v_session uuid;
  v_summary jsonb;
begin
  perform test.reset();
  v_mod := test.create_user('sess-mod@example.com');
  v_user := test.create_user('sess-user@example.com');
  v_other := test.create_user('sess-other@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('a3333333-3333-4333-8333-333333333333', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'a3333333-3333-4333-8333-333333333333', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card_a := public.create_card('session-card-one', v_topic, 'https://example.com/s1',
    'Example Publisher', 'The first card in the session',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Something worth taking away.'], 'Try it for one week.', 'article', 'beginner', 6, 70);
  v_card_b := public.create_card('session-card-two', v_topic, 'https://example.com/s2',
    'Example Publisher', 'The second card in the session',
    'Another summary that is long enough to satisfy the minimum length rule for a content version.',
    array['Something else worth taking away.'], 'Try that for one week.', 'article', 'beginner', 9, 70);
  perform test.become_service();
  perform public.record_link_check(v_card_a, true);
  perform public.record_link_check(v_card_b, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card_a, 'approve');
  perform public.moderate_content(v_card_b, 'approve');

  perform test.become(v_user);
  v_session := public.start_feed_session(v_topic, 7);
  perform test.ok(v_session is not null, 'a session can be started');

  perform test.equals(
    (select config_version from public.feed_sessions where id = v_session), 1,
    'the session records which ranking configuration produced it');

  perform public.record_recommendations(v_session, jsonb_build_array(
    jsonb_build_object('contentId', v_card_a, 'position', 1, 'score', 0.8123,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false),
    jsonb_build_object('contentId', v_card_b, 'position', 2, 'score', 0.7421,
      'components', jsonb_build_object('quality', 0.6), 'isDiscovery', true)
  ));

  perform test.equals(
    (select count(*)::int from public.recommendations where session_id = v_session), 2,
    'what was recommended is logged');
  perform test.ok(
    (select components -> 'quality' from public.recommendations
      where session_id = v_session and position = 1) is not null,
    'the component breakdown is logged, so the explanation has evidence');

  -- Finish one of the two.
  perform public.set_interaction(v_card_a, 'complete');
  perform public.set_interaction(v_card_b, 'save', true);

  v_summary := public.end_feed_session(v_session);

  perform test.equals((v_summary ->> 'explored')::int, 2, 'the summary counts what was offered');
  perform test.equals((v_summary ->> 'completed')::int, 1,
    'the summary counts only what was finished');
  perform test.equals((v_summary ->> 'saved')::int, 1, 'and what was saved');
  perform test.equals((v_summary ->> 'minutes')::int, 6,
    'the minutes counted are those of the card actually finished');

  -- Another account cannot touch it.
  perform test.become(v_other);
  perform test.refuses(
    format('select public.end_feed_session(%L)', v_session),
    'another account cannot end someone else''s session');
  perform test.refuses(
    format('select public.record_recommendations(%L, ''[]''::jsonb)', v_session),
    'another account cannot write into someone else''s session');
  perform test.refuses(
    format('select public.record_impressions(array[%L]::uuid[], %L)', v_card_a, v_session),
    'another account cannot attribute impressions to someone else''s session');
  perform test.equals(
    (select count(*)::int from public.recommendations where session_id = v_session), 0,
    'and cannot read what was recommended to them');
end;
$$;

-- A guest is a full participant in the feed.
do $$
declare
  v_mod uuid;
  v_guest uuid;
  v_topic uuid;
  v_card uuid;
  v_session uuid;
begin
  perform test.reset();
  v_mod := test.create_user('guest-mod@example.com');
  v_guest := test.create_user(null, true);

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('a4444444-4444-4444-8444-444444444444', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'a4444444-4444-4444-8444-444444444444', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('guest-visible-card', v_topic, 'https://example.com/guest',
    'Example Publisher', 'A card a guest can read',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_guest);

  perform public.set_declared_topics(array[v_topic]);
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_guest and declared), 1,
    'a guest can choose topics');

  v_session := public.start_feed_session(v_topic, 7);
  perform test.ok(v_session is not null, 'a guest can run a session');

  perform public.set_interaction(v_card, 'complete');
  perform test.ok(
    (select completed_at from public.content_interactions
      where user_id = v_guest and content_id = v_card) is not null,
    'a guest''s progress is recorded on their own account');

  perform public.set_interaction(v_card, 'save', true);
  perform test.ok(
    (select saved_at from public.content_interactions
      where user_id = v_guest and content_id = v_card) is not null,
    'a guest can save');

  -- The account is the same one registration attaches to, so nothing moves
  -- and nothing can be lost. The identity tests cover the upgrade itself.
  perform test.become_owner();
  perform test.equals(
    (select is_anonymous from auth.users where id = v_guest), true,
    'the work belongs to the guest account itself');
end;
$$;

-- Impressions are counted per card, and only for published content.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_session uuid;
begin
  perform test.reset();
  v_mod := test.create_user('imp-mod@example.com');
  v_user := test.create_user('imp-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('a5555555-5555-4555-8555-555555555555', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'a5555555-5555-4555-8555-555555555555', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('impression-test-card', v_topic, 'https://example.com/imp',
    'Example Publisher', 'A card to count impressions for',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);
  v_session := public.start_feed_session(v_topic, 7);

  perform test.equals(public.record_impressions(array[v_card], v_session), 1,
    'an impression is counted');
  perform test.equals(
    (select impressions from public.content_interactions
      where user_id = v_user and content_id = v_card), 1,
    'and recorded against the person');

  perform public.record_impressions(array[v_card], v_session);
  perform test.equals(
    (select impressions from public.content_interactions
      where user_id = v_user and content_id = v_card), 2,
    'a second showing counts again, which is what the repetition penalty needs');

  perform test.equals(
    (select completed_at from public.content_interactions
      where user_id = v_user and content_id = v_card), null,
    'an impression is never progress');
end;
$$;

-- A visitor with no account leaves no trace until they act.
do $$
begin
  perform test.reset();
  perform test.become_anonymous();

  -- There is no session to start and no interaction to record without an
  -- account; both are refused rather than silently creating one.
  perform test.refuses(
    'select public.start_feed_session(null, 7)',
    'a visitor with no account cannot start a recorded session');
  perform test.refuses(
    format('select public.set_interaction(%L, ''complete'')', gen_random_uuid()),
    'a visitor with no account cannot record progress');
  perform test.refuses(
    'select public.set_declared_topics(array[]::uuid[])',
    'a visitor with no account cannot store preferences');

  perform test.become_owner();
  perform test.equals(
    (select count(*)::int from public.feed_sessions), 0,
    'nothing was created on their behalf');
  perform test.equals(
    (select count(*)::int from public.content_interactions), 0,
    'and nothing was recorded about them');
end;
$$;
