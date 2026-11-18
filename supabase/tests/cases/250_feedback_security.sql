-- Regression tests for the adaptive-migration security review (2026-11-17):
-- seven-piece review ELIGIBILITY from authoritative records (not ended_at
-- alone), idempotent and edit-safe feedback, 0/1/6/7-item boundaries,
-- abandoned vs completed sessions, stale-interaction isolation, cross-account
-- isolation of app.apply_affinity, and the format-affinity recompute.
--
-- A helper: creates and publishes a card, returns its id.
create or replace function pg_temp.publish_card(p_mod uuid, p_topic uuid, p_slug text, p_format public.content_format)
returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  perform test.become(p_mod);
  v_id := public.create_card(p_slug, p_topic, 'https://example.com/'||p_slug,
    'Example Publisher', 'A card: '||p_slug,
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    p_format, 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_id, true);
  perform test.become(p_mod);
  perform public.moderate_content(v_id, 'approve');
  return v_id;
end;
$$;

-- Eligibility, idempotency, edits, abandoned vs completed.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_c1 uuid;
  v_c2 uuid;
  v_c3 uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_abandoned uuid;
begin
  perform test.reset();
  v_mod := test.create_user('sec-mod@example.com');
  v_user := test.create_user('sec-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('fcfcfcfc-cfcf-4cfc-8cfc-cfcfcfcfcfcf', 'learning', 'Learning', 'Getting better at getting better.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'fcfcfcfc-cfcf-4cfc-8cfc-cfcfcfcfcfcf', 'memory', 'Memory');

  v_c1 := pg_temp.publish_card(v_mod, v_topic, 'sec-card-one', 'video');
  v_c2 := pg_temp.publish_card(v_mod, v_topic, 'sec-card-two', 'video');
  v_c3 := pg_temp.publish_card(v_mod, v_topic, 'sec-card-three', 'article');

  perform test.become(v_user);

  -- NOT COMPLETE: a session that has not been ended cannot be reviewed.
  v_s1 := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s1, jsonb_build_array(
    jsonb_build_object('contentId', v_c1, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform test.refuses(
    format('select public.record_session_review(%L, true)', v_s1),
    'a session that is not complete cannot be reviewed');

  -- ENDED BUT NOT ENGAGED: ending without engaging is not reviewable. This is
  -- the owner's core finding — ended_at alone does not prove the person went
  -- through the session.
  perform public.end_feed_session(v_s1);
  perform test.refuses(
    format('select public.record_session_review(%L, true)', v_s1),
    'ending a session with no engagement does not make it reviewable (ended_at is not proof)');
  perform test.equals(
    (select count(*)::int from public.session_reviews where session_id = v_s1), 0,
    'and no review row was created');

  -- ENGAGED: completing a recommended card in-session makes it eligible. A
  -- fresh session, because a completed card is excluded from later candidates.
  v_s2 := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s2, jsonb_build_array(
    jsonb_build_object('contentId', v_c1, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform public.set_interaction(v_c1, 'complete');
  perform public.end_feed_session(v_s2);
  perform public.record_session_review(v_s2, true, 4::smallint, 'video', null);
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
    'an engaged, completed session can be reviewed and records one video observation');

  -- IDEMPOTENT: resubmitting the same session's review adds no evidence.
  perform public.record_session_review(v_s2, true, 5::smallint, 'video', 'new note');
  perform public.record_session_review(v_s2, false, 2::smallint, 'video', null);
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
    'resubmitting the same session keeps video at one observation, never inflating it');

  -- GRADUAL ACROSS SESSIONS: a distinct engaged session raises the count.
  declare v_s3 uuid;
  begin
    v_s3 := public.start_feed_session(v_topic, 7);
    perform public.record_recommendations(v_s3, jsonb_build_array(
      jsonb_build_object('contentId', v_c2, 'position', 1, 'score', 0.8,
        'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
    perform public.set_interaction(v_c2, 'complete');
    perform public.end_feed_session(v_s3);
    perform public.record_session_review(v_s3, true, 5::smallint, 'video', null);
    perform test.equals(
      (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 2,
      'a distinct engaged session raises the video observation count to two');

    -- EDIT format: changing s2's review from video to article moves exactly
    -- one observation across; s3 still holds the other for video.
    perform public.record_session_review(v_s2, true, 4::smallint, 'article', null);
    perform test.equals(
      (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
      'editing a review off video drops video to one observation');
    perform test.equals(
      (select observations from public.user_format_affinity where user_id = v_user and format = 'article'), 1,
      'and article gains the moved observation');

    -- EDIT clear: removing s3's format leaves only s2's article.
    perform public.record_session_review(v_s3, true, 4::smallint, null, null);
    perform test.equals(
      coalesce((select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 0), 0,
      'clearing the other review''s format returns video to zero');
    perform test.equals(
      (select observations from public.user_format_affinity where user_id = v_user and format = 'article'), 1,
      'article still rests on its one observation');
  end;

  -- UNAUTHORISED: another account cannot review this user's session.
  perform test.become(v_mod);
  perform test.refuses(
    format('select public.record_session_review(%L, true, 5::smallint, ''video'')', v_s2),
    'a different account cannot review someone else''s session');
end;
$$;

-- 0 / 1 / 6 / 7 engaged items, with authoritative records.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_cards uuid[] := '{}';
  v_card uuid;
  v_session uuid;
  v_recs jsonb;
  i integer;
begin
  perform test.reset();
  v_mod := test.create_user('bnd-mod@example.com');
  v_user := test.create_user('bnd-user@example.com');
  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('fefefefe-fefe-4fef-8fef-fefefefefefe', 'focus', 'Focus', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'fefefefe-fefe-4fef-8fef-fefefefefefe', 'deep-work', 'Deep work');

  -- Seven published cards.
  for i in 1..7 loop
    v_cards := v_cards || pg_temp.publish_card(v_mod, v_topic, 'bnd-card-'||i, 'article');
  end loop;

  -- Helper to run one boundary case: a fresh session recommending all seven,
  -- engaging the first p_engaged, ended, then the review attempted.
  perform test.become(v_user);

  -- 0 engaged: ended, nothing done -> NOT eligible.
  v_session := public.start_feed_session(v_topic, 7);
  v_recs := '[]'::jsonb;
  for i in 1..7 loop
    v_recs := v_recs || jsonb_build_object('contentId', v_cards[i], 'position', i, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false);
  end loop;
  perform public.record_recommendations(v_session, v_recs);
  perform public.end_feed_session(v_session);
  perform test.refuses(
    format('select public.record_session_review(%L, true)', v_session),
    '0 engaged items: an abandoned, empty session is not reviewable');

  -- 1 engaged: eligible.
  v_session := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_session, v_recs);
  perform public.set_interaction(v_cards[1], 'complete');
  perform public.end_feed_session(v_session);
  perform public.record_session_review(v_session, true);
  perform test.equals(
    (select content_count from public.session_reviews where session_id = v_session), 7,
    '1 engaged item: eligible; the review records all seven delivered');

  -- 6 engaged: eligible. (Complete cards 2..7; card 1 was completed above and
  -- is excluded from candidates, so this session recommends the same set but
  -- engagement is six fresh completions.)
  perform test.become_service();
  -- reset this user's completions so the boundary is clean
  delete from public.content_interactions where user_id = v_user;
  perform test.become(v_user);
  v_session := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_session, v_recs);
  for i in 1..6 loop
    perform public.set_interaction(v_cards[i], 'complete');
  end loop;
  perform public.end_feed_session(v_session);
  perform public.record_session_review(v_session, true, 4::smallint, null, null);
  perform test.ok(
    (select count(*)::int from public.session_reviews where session_id = v_session) = 1,
    '6 engaged items: eligible');

  -- 7 engaged: eligible.
  perform test.become_service();
  delete from public.content_interactions where user_id = v_user;
  perform test.become(v_user);
  v_session := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_session, v_recs);
  for i in 1..7 loop
    perform public.set_interaction(v_cards[i], 'complete');
  end loop;
  perform public.end_feed_session(v_session);
  perform public.record_session_review(v_session, true, 5::smallint, 'article', null);
  perform test.ok(
    (select count(*)::int from public.session_reviews where session_id = v_session) = 1,
    '7 engaged items: eligible');
end;
$$;

-- Stale interactions from before the session must not make it look engaged.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_old uuid;
  v_s_old uuid;
  v_s_new uuid;
begin
  perform test.reset();
  v_mod := test.create_user('stale-mod@example.com');
  v_user := test.create_user('stale-user@example.com');
  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f1f1f1f1-1f1f-41f1-81f1-1f1f1f1f1f1f', 'comms', 'Communication', 'Saying what you mean.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f1f1f1f1-1f1f-41f1-81f1-1f1f1f1f1f1f', 'writing', 'Writing');
  v_old := pg_temp.publish_card(v_mod, v_topic, 'stale-old-card', 'article');

  -- Session one: the person completes the card; then its interaction is aged
  -- two hours into the past (standing in for a genuinely earlier session).
  perform test.become(v_user);
  v_s_old := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s_old, jsonb_build_array(
    jsonb_build_object('contentId', v_old, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform public.set_interaction(v_old, 'complete');
  perform public.end_feed_session(v_s_old);
  perform test.become_service();
  update public.content_interactions
  set completed_at = now() - interval '2 hours', opened_at = now() - interval '2 hours'
  where user_id = v_user and content_id = v_old;

  -- Session two starts now and (artificially) lists the already-completed
  -- card. Its only interaction is two hours old — before this session's
  -- window — so session two is NOT engaged and cannot be reviewed.
  perform test.become(v_user);
  v_s_new := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_s_new, jsonb_build_array(
    jsonb_build_object('contentId', v_old, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)));
  perform public.end_feed_session(v_s_new);
  perform test.refuses(
    format('select public.record_session_review(%L, true)', v_s_new),
    'a completion from an earlier session does not make a later session reviewable');
end;
$$;

-- app.apply_affinity cannot be abused to write to another account's profile.
do $$
declare
  v_victim uuid;
  v_attacker uuid;
  v_topic uuid;
  v_mod uuid;
  v_card uuid;
begin
  perform test.reset();
  v_victim := test.create_user('victim@example.com');
  v_attacker := test.create_user('attacker@example.com');
  v_mod := test.create_user('abuse-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('fdfdfdfd-dfdf-4dfd-8dfd-dfdfdfdfdfdf', 'health', 'Health', 'Looking after yourself.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'fdfdfdfd-dfdf-4dfd-8dfd-dfdfdfdfdfdf', 'sleep', 'Sleep');
  insert into public.content_items (id, slug, kind, origin, status, primary_topic_id, source_url, is_high_impact)
  values ('fdfdfdfd-0000-4000-8000-000000000001', 'attacker-probe-card', 'external_resource', 'curated', 'draft', v_topic, 'https://e.com/x', false);

  perform test.become(v_attacker);
  perform test.refuses(
    format('select app.apply_affinity(%L::uuid, %L::uuid, 1.0, 0.99)', v_victim, 'fdfdfdfd-0000-4000-8000-000000000001'),
    'a client cannot call app.apply_affinity directly — execute is revoked');

  perform test.become_anonymous();
  perform test.refuses(
    format('select app.apply_affinity(%L::uuid, %L::uuid, 1.0, 0.99)', v_victim, 'fdfdfdfd-0000-4000-8000-000000000001'),
    'and neither can an anonymous visitor');

  perform test.become_service();
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_victim), 0,
    'the victim''s profile was never touched');

  -- The legitimate path still works and affects only the caller.
  v_card := pg_temp.publish_card(v_mod, v_topic, 'legitimate-path-card', 'video');
  perform test.become(v_attacker);
  perform public.set_interaction(v_card, 'complete');
  perform test.ok(
    (select affinity from public.user_topics where user_id = v_attacker and topic_id = v_topic) > 0.200,
    'the legitimate path updates only the caller''s own affinity');
  perform test.become_service();
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_victim), 0,
    'and still nothing was written to the victim');
end;
$$;
