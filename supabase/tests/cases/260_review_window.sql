-- Precise session-window boundary tests for review eligibility. Each case
-- manufactures the session window and the interaction timestamp so the
-- inclusive [started_at, ended_at] bounds and the per-timestamp (no greatest)
-- evaluation can be checked exactly. Real functions, real PostgreSQL.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_other uuid;
  v_topic uuid;
  v_card uuid;
  v_s uuid;
  t0 constant timestamptz := '2026-06-15T10:00:00Z';
  t1 constant timestamptz := '2026-06-15T10:15:00Z';
  t2 constant timestamptz := '2026-06-15T10:30:00Z';

  -- Builds a fresh ended session over v_card with window [t0, t2], and
  -- (optionally) one interaction for a given user at a given event/timestamp.
  function_placeholder boolean;
begin
  perform test.reset();
  v_mod := test.create_user('win-mod@example.com');
  v_user := test.create_user('win-user@example.com');
  v_other := test.create_user('win-other@example.com');

  perform test.become_service();
  insert into public.user_roles(user_id, role) values (v_mod, 'moderator');
  insert into public.categories(id, slug, name, description)
  values ('f2f2f2f2-2f2f-42f2-82f2-2f2f2f2f2f2f', 'learning', 'Learning', 'Getting better at getting better.');
  v_topic := gen_random_uuid();
  insert into public.topics(id, category_id, slug, name)
  values (v_topic, 'f2f2f2f2-2f2f-42f2-82f2-2f2f2f2f2f2f', 'memory', 'Memory');

  perform test.become(v_mod);
  v_card := public.create_card('window-test-card', v_topic, 'https://example.com/w',
    'Example Publisher', 'A card for window boundary tests',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'video', 'beginner', 8, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- ===================================================================
  -- Helper inline: for each case we (as user) start+recommend a session,
  -- (as service) pin its window and write one interaction, then (as user)
  -- attempt the review.
  -- ===================================================================

  -- CASE 1: engagement BEFORE start (opened at t0 - 1 min) -> REJECT.
  perform test.become(v_user);
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where user_id = v_user and content_id = v_card;
  insert into public.content_interactions(user_id, content_id, opened_at) values (v_user, v_card, t0 - interval '1 minute');
  perform test.become(v_user);
  perform test.refuses(format('select public.record_session_review(%L, true)', v_s),
    'CASE 1: engagement before start is rejected');

  -- CASE 2: engagement AFTER end (opened at t2 + 1 min) -> REJECT.
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where user_id = v_user and content_id = v_card;
  insert into public.content_interactions(user_id, content_id, opened_at) values (v_user, v_card, t2 + interval '1 minute');
  perform test.become(v_user);
  perform test.refuses(format('select public.record_session_review(%L, true)', v_s),
    'CASE 2: engagement after end is rejected (upper bound enforced)');

  -- CASE 3: engagement EXACTLY at start (opened at t0) -> ACCEPT.
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where user_id = v_user and content_id = v_card;
  insert into public.content_interactions(user_id, content_id, opened_at) values (v_user, v_card, t0);
  perform test.become(v_user);
  perform public.record_session_review(v_s, true);
  perform test.equals((select engaged_count from public.session_reviews where session_id = v_s), 1,
    'CASE 3: engagement exactly at start is accepted (lower bound inclusive)');

  -- CASE 4: engagement EXACTLY at end (completed at t2) -> ACCEPT.
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where user_id = v_user and content_id = v_card;
  insert into public.content_interactions(user_id, content_id, completed_at) values (v_user, v_card, t2);
  perform test.become(v_user);
  perform public.record_session_review(v_s, true);
  perform test.equals((select engaged_count from public.session_reviews where session_id = v_s), 1,
    'CASE 4: engagement exactly at end is accepted (upper bound inclusive)');

  -- CASE 5: valid in-window open (t1) followed by a later out-of-window
  -- completion (t2 + 1h) -> ACCEPT. Proves greatest() is not used: the valid
  -- earlier event is not masked by the later one.
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where user_id = v_user and content_id = v_card;
  insert into public.content_interactions(user_id, content_id, opened_at, completed_at)
    values (v_user, v_card, t1, t2 + interval '1 hour');
  perform test.become(v_user);
  perform public.record_session_review(v_s, true);
  perform test.equals((select engaged_count from public.session_reviews where session_id = v_s), 1,
    'CASE 5: a valid in-window open is not masked by a later out-of-window completion');

  -- CASE 6: another user's in-window engagement does NOT make the owner's
  -- session eligible -> REJECT. The interaction belongs to v_other, not v_user.
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where content_id = v_card;
  insert into public.content_interactions(user_id, content_id, opened_at) values (v_other, v_card, t1);
  perform test.become(v_user);
  perform test.refuses(format('select public.record_session_review(%L, true)', v_s),
    'CASE 6: another user''s in-window engagement does not make this session eligible');

  -- CASE 7: a skip in window also qualifies as engagement -> ACCEPT.
  v_s := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.become_service();
  update public.feed_sessions set started_at = t0, ended_at = t2 where id = v_s;
  delete from public.content_interactions where content_id = v_card;
  insert into public.content_interactions(user_id, content_id, skipped_at) values (v_user, v_card, t1);
  perform test.become(v_user);
  perform public.record_session_review(v_s, false, 1::smallint);
  perform test.equals((select engaged_count from public.session_reviews where session_id = v_s), 1,
    'CASE 7: a skip in window qualifies (negative feedback on a poor session is allowed)');
end;
$$;
