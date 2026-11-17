-- Regression tests for the 2026-11-17 adaptive-migration security review:
-- idempotent feedback, correct edit behaviour, seven-piece completion
-- enforcement, and that app.apply_affinity cannot be abused across accounts.

-- Shared setup: a published video card and a published article card.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_video uuid;
  v_article uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_s3 uuid;
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

  perform test.become(v_mod);
  v_video := public.create_card('sec-video', v_topic, 'https://example.com/v',
    'Example Publisher', 'A video card',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'video', 'beginner', 8, 70);
  v_article := public.create_card('sec-article', v_topic, 'https://example.com/a',
    'Example Publisher', 'An article card',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_video, true);
  perform public.record_link_check(v_article, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_video, 'approve');
  perform public.moderate_content(v_article, 'approve');

  perform test.become(v_user);

  -- INCOMPLETE SESSION: a session that has not been ended cannot be reviewed.
  v_s1 := public.start_feed_session(v_topic, 7);
  perform test.refuses(
    format('select public.record_session_review(%L, true)', v_s1),
    'a session that is not complete cannot be reviewed (seven-piece completion enforced)');

  -- Complete it, then it can be reviewed.
  perform public.end_feed_session(v_s1);
  perform public.record_session_review(v_s1, true, 4::smallint, 'video', null);
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
    'a completed session can be reviewed and records one video observation');

  -- IDEMPOTENT: resubmitting the same session's review twice more adds nothing.
  perform public.record_session_review(v_s1, true, 5::smallint, 'video', 'changed my note');
  perform public.record_session_review(v_s1, false, 2::smallint, 'video', null);
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
    'resubmitting the same session keeps video at one observation, never inflating it');

  -- GRADUAL ACROSS SESSIONS: a second, different completed session preferring
  -- video genuinely raises the count — preference grows with real sessions.
  v_s2 := public.start_feed_session(v_topic, 7);
  perform public.end_feed_session(v_s2);
  perform public.record_session_review(v_s2, true, 5::smallint, 'video', null);
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 2,
    'a distinct completed session raises the video observation count to two');
  perform test.ok(
    (select affinity from public.user_format_affinity where user_id = v_user and format = 'video')
      > (select round(1.0 - 0.7 * power(0.8, 1), 3)),
    'and the affinity rises accordingly, still below 1.0');

  -- EDIT changing the preferred format: editing session 1 from video to
  -- article moves exactly one observation across, without inventing evidence.
  perform public.record_session_review(v_s1, true, 4::smallint, 'article', null);
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
    'editing a review off video drops video to one observation (session 2 still prefers video)');
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'article'), 1,
    'and article now has the one observation moved to it');

  -- EDIT clearing the preferred format removes that evidence entirely.
  perform public.record_session_review(v_s2, true, 4::smallint, null, null);
  perform test.equals(
    coalesce((select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 0), 0,
    'clearing a review''s format removes its contribution; video returns to zero');
  perform test.equals(
    (select count(*)::int from public.user_format_affinity where user_id = v_user and format = 'video'), 0,
    'leaving no stale video row behind');

  -- UNAUTHORISED: a different user cannot review this user's session.
  v_s3 := public.start_feed_session(v_topic, 7);
  perform public.end_feed_session(v_s3);
  perform test.become(v_mod);
  perform test.refuses(
    format('select public.record_session_review(%L, true, 5::smallint, ''video'')', v_s3),
    'a different account cannot review someone else''s session');
end;
$$;

-- app.apply_affinity cannot be abused to write to another account's profile.
do $$
declare
  v_victim uuid;
  v_attacker uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_victim := test.create_user('victim@example.com');
  v_attacker := test.create_user('attacker@example.com');

  perform test.become_service();
  insert into public.categories (id, slug, name, description)
  values ('fdfdfdfd-dfdf-4dfd-8dfd-dfdfdfdfdfdf', 'focus', 'Focus', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'fdfdfdfd-dfdf-4dfd-8dfd-dfdfdfdfdfdf', 'deep-work', 'Deep work');
  insert into public.content_items (id, slug, kind, origin, status, primary_topic_id, source_url, is_high_impact)
  values ('fdfdfdfd-0000-4000-8000-000000000001', 'attacker-probe-card', 'external_resource', 'curated', 'draft', v_topic, 'https://e.com/x', false);

  -- The attacker tries to poison the victim's affinity directly.
  perform test.become(v_attacker);
  perform test.refuses(
    format('select app.apply_affinity(%L::uuid, %L::uuid, 1.0, 0.99)', v_victim, 'fdfdfdfd-0000-4000-8000-000000000001'),
    'a client cannot call app.apply_affinity directly — execute is revoked');

  -- An anonymous visitor cannot either.
  perform test.become_anonymous();
  perform test.refuses(
    format('select app.apply_affinity(%L::uuid, %L::uuid, 1.0, 0.99)', v_victim, 'fdfdfdfd-0000-4000-8000-000000000001'),
    'and neither can an anonymous visitor');

  -- The victim has no injected affinity.
  perform test.become_service();
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_victim), 0,
    'the victim''s profile was never touched');

  -- The legitimate path still works: set_interaction (which calls
  -- apply_affinity internally as the owner) updates only the caller's own
  -- profile.
  perform test.become_service();
  -- Draft first (the published constraint needs a version + review + link
  -- check), then set the version, then publish.
  insert into public.content_items (id, slug, kind, origin, status, primary_topic_id, source_url)
  values ('fdfdfdfd-0000-4000-8000-000000000002', 'legitimate-path-card', 'external_resource', 'curated', 'draft', v_topic, 'https://e.com/ok');
  insert into public.content_versions (id, content_id, version_no, title, summary, takeaways, next_step, source_name)
  values ('fdfdfdfd-0000-4000-8000-000000000003', 'fdfdfdfd-0000-4000-8000-000000000002', 1, 'A legitimate card',
    'A summary long enough to satisfy the minimum length rule applied to every version here.',
    array['A takeaway long enough to pass.'], 'Do the next step.', 'Pub');
  update public.content_items set current_version_id = 'fdfdfdfd-0000-4000-8000-000000000003'
  where id = 'fdfdfdfd-0000-4000-8000-000000000002';
  update public.content_items
  set status = 'published', link_checked_at = now(), reviewed_at = now(), published_at = now()
  where id = 'fdfdfdfd-0000-4000-8000-000000000002';

  perform test.become(v_attacker);
  perform public.set_interaction('fdfdfdfd-0000-4000-8000-000000000002', 'complete');
  perform test.ok(
    (select affinity from public.user_topics where user_id = v_attacker and topic_id = v_topic) > 0.200,
    'the legitimate path still updates the caller''s own affinity');
  perform test.become_service();
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_victim), 0,
    'and still nothing was written to the victim');
end;
$$;
