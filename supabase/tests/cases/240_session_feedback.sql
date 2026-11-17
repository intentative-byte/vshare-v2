-- Session-end feedback and adaptive learning. Each of the owner's eight
-- acceptance tests is covered here at the database layer (the ranker's
-- format/confidence behaviour is in tests/unit/adaptive-ranking.test.ts).
--
-- Setup helper: a category, a topic, a published video card and a published
-- article card, a learner, and a seven-size session with both logged.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_other uuid;
  v_topic uuid;
  v_video uuid;
  v_article uuid;
  v_session uuid;
  v_review jsonb;
  v_before numeric;
  v_after numeric;
begin
  perform test.reset();
  v_mod := test.create_user('fb-mod@example.com');
  v_user := test.create_user('fb-user@example.com');
  v_other := test.create_user('fb-other@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f8888888-8888-4888-8888-888888888888', 'learning', 'Learning', 'Getting better at getting better.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f8888888-8888-4888-8888-888888888888', 'memory', 'Memory');

  perform test.become(v_mod);
  v_video := public.create_card('a-video-card', v_topic, 'https://example.com/v',
    'Example Publisher', 'A video about memory',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'video', 'beginner', 8, 70);
  v_article := public.create_card('an-article-card', v_topic, 'https://example.com/a',
    'Example Publisher', 'An article about memory',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_video, true);
  perform public.record_link_check(v_article, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_video, 'approve');
  perform public.moderate_content(v_article, 'approve');

  -- The learner runs a session over both cards.
  perform test.become(v_user);
  v_session := public.start_feed_session(v_topic, 7);
  perform public.record_recommendations(v_session, jsonb_build_array(
    jsonb_build_object('contentId', v_video, 'position', 1, 'score', 0.80,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false),
    jsonb_build_object('contentId', v_article, 'position', 2, 'score', 0.70,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)
  ));

  -- The session is completed through the normal lifecycle before it can be
  -- reviewed (seven-piece completion, verified from ended_at, not invented).
  perform public.end_feed_session(v_session);

  -- ============================================================= ACCEPTANCE
  -- 2. A 4/5 rating is stored accurately and does not imply mastery.
  v_review := public.record_session_review(v_session, true, 4::smallint, 'video', 'Liked the pace.');
  perform test.equals(
    (select rating from public.session_reviews where session_id = v_session), 4::smallint,
    'a 4/5 rating is stored exactly');
  perform test.equals(
    (select rating_scale from public.session_reviews where session_id = v_session), 5::smallint,
    'on a five-point scale');
  perform test.equals(
    (select content_count from public.session_reviews where session_id = v_session), 2,
    'the review is tied to the items actually presented (the two logged)');
  -- No mastery/skill table exists, and the review does not record a completion
  -- or any learning: satisfaction is kept separate from demonstrated learning.
  perform test.equals(
    (select count(*)::int from public.content_interactions
      where user_id = v_user and completed_at is not null), 0,
    'a rating records satisfaction, never a completion or mastery');

  -- 1 & 3. Positive feedback raises the video preference without locking it,
  -- and without excluding other formats.
  perform test.ok(
    (select affinity from public.user_format_affinity
      where user_id = v_user and format = 'video') > 0.300,
    'choosing video raises the video preference above the neutral baseline');
  perform test.ok(
    (select affinity from public.user_format_affinity
      where user_id = v_user and format = 'video') < 1.000,
    'but never locks it at the maximum (a later signal can still move it)');
  perform test.equals(
    (select count(*)::int from public.user_format_affinity
      where user_id = v_user and format = 'article'), 0,
    'and no other format is pushed down: article is simply left at its neutral default');

  -- IDEMPOTENCY: re-submitting a review for the SAME session (the bug the
  -- security review found) must not add learning evidence.
  v_before := (select affinity from public.user_format_affinity where user_id = v_user and format = 'video');
  perform public.record_session_review(v_session, true, 5::smallint, 'video', null);
  v_after := (select affinity from public.user_format_affinity where user_id = v_user and format = 'video');
  perform test.equals(v_after, v_before,
    'resubmitting the same session''s review changes nothing: feedback is idempotent');
  perform test.equals(
    (select observations from public.user_format_affinity where user_id = v_user and format = 'video'), 1,
    'and the format still rests on exactly one observation, not two');

  -- 8 (part). A review for someone else's session is refused.
  perform test.become(v_other);
  perform test.refuses(
    format('select public.record_session_review(%L, true)', v_session),
    'a review cannot be recorded against another user''s session');
  -- And another user cannot read this user's review.
  perform test.equals(
    (select count(*)::int from public.session_reviews where session_id = v_session), 0,
    'nor read it: the review is owner-only');
end;
$$;

-- 4. A negative subsequent session can reverse an earlier preference.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_raised numeric;
  v_reversed numeric;
begin
  perform test.reset();
  v_mod := test.create_user('rev-mod@example.com');
  v_user := test.create_user('rev-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f9999999-9999-4999-8999-999999999999', 'focus', 'Focus', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f9999999-9999-4999-8999-999999999999', 'deep-work', 'Deep work');

  perform test.become(v_mod);
  v_card := public.create_card('reversible-card', v_topic, 'https://example.com/r',
    'Example Publisher', 'A card to reverse a preference on',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- Completing raises the topic affinity.
  perform test.become(v_user);
  perform public.set_interaction(v_card, 'complete');
  v_raised := (select affinity from public.user_topics where user_id = v_user and topic_id = v_topic);
  perform test.ok(v_raised > 0.200, 'completing raises the topic affinity');

  -- A later negative session (skips) brings it back down — the moving average
  -- is reversible, so nothing is permanently locked.
  perform public.set_interaction(v_card, 'skip', true);
  perform public.set_interaction(v_card, 'skip', true);
  v_reversed := (select affinity from public.user_topics where user_id = v_user and topic_id = v_topic);
  perform test.ok(v_reversed < v_raised,
    'a negative subsequent session reverses the earlier preference');
  perform test.ok(
    (select observations from public.user_topics where user_id = v_user and topic_id = v_topic) >= 2,
    'and the evidence count (confidence) grew with every action');
end;
$$;

-- 5 & 6 & 7. New learner, finite session, skippable review.
do $$
declare
  v_mod uuid;
  v_new uuid;
  v_topic uuid;
  v_card uuid;
  v_session uuid;
begin
  perform test.reset();
  v_mod := test.create_user('new-mod@example.com');
  v_new := test.create_user('brand-new@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('fafafafa-afaf-4afa-8afa-afafafafafaf', 'comms', 'Communication', 'Saying what you mean.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'fafafafa-afaf-4afa-8afa-afafafafafaf', 'writing', 'Writing');

  perform test.become(v_mod);
  v_card := public.create_card('a-first-card', v_topic, 'https://example.com/n',
    'Example Publisher', 'A card for a brand new learner',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- 5. A brand-new learner, with no history and no feedback, can start a
  -- session (the ranker's cold-start behaviour is unit-tested separately).
  perform test.become(v_new);
  perform test.equals(
    (select count(*)::int from public.session_reviews where user_id = v_new), 0,
    'a new learner has no feedback history');
  v_session := public.start_feed_session(v_topic, 7);
  perform test.ok(v_session is not null, 'and can still start a session');

  perform public.record_recommendations(v_session, jsonb_build_array(
    jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
      'components', jsonb_build_object('quality', 0.7), 'isDiscovery', false)
  ));

  -- 7. The learner completes a card but SKIPS the review. Progress survives;
  -- no review is created; nothing breaks.
  perform public.set_interaction(v_card, 'complete');
  perform test.equals(
    (select count(*)::int from public.content_interactions
      where user_id = v_new and completed_at is not null), 1,
    'a completion (progress) is recorded during the session');
  perform test.equals(
    (select count(*)::int from public.session_reviews where user_id = v_new), 0,
    'skipping the review leaves no review and loses no progress');

  -- 6. The session is finite: the review, when given, is tied to exactly the
  -- items presented — there is no mechanism to extend the session.
  perform public.end_feed_session(v_session);
  perform public.record_session_review(v_session, true);
  perform test.equals(
    (select content_count from public.session_reviews where session_id = v_session), 1,
    'the review covers exactly the items shown, not an endless stream');
end;
$$;

-- 8 (part) & 9 & 10. Auditable, exportable, deletable; cannot publish/admit.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_session uuid;
  v_export jsonb;
  v_draft uuid;
begin
  perform test.reset();
  v_mod := test.create_user('gov-mod@example.com');
  v_user := test.create_user('gov-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('fbfbfbfb-bfbf-4bfb-8bfb-bfbfbfbfbfbf', 'health', 'Health', 'Looking after yourself.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'fbfbfbfb-bfbf-4bfb-8bfb-bfbfbfbfbfbf', 'sleep', 'Sleep');

  perform test.become(v_mod);
  v_card := public.create_card('gov-card', v_topic, 'https://example.com/g',
    'Example Publisher', 'A governance card',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'video', 'beginner', 6, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');
  -- A separate draft, to prove the review cannot publish it.
  v_draft := public.create_card('gov-draft', v_topic, 'https://example.com/d',
    'Example Publisher', 'A draft that must stay a draft',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'video', 'beginner', 6, 70);

  perform test.become(v_user);
  v_session := public.start_feed_session(v_topic, 7);
  perform public.end_feed_session(v_session);
  perform public.record_session_review(v_session, true, 5::smallint, 'video', 'Great.');

  -- 8. Auditable: a review writes an audit entry, with no personal content.
  perform test.become_owner();
  perform test.equals(
    (select count(*)::int from public.audit_log
      where action = 'session.review' and target_id = v_session::text), 1,
    'a review is auditable');
  perform test.ok(
    (select diff = '{}'::jsonb from public.audit_log
      where action = 'session.review' and target_id = v_session::text),
    'and the audit trail holds no personal rating, format or note');

  -- 9. Exportable and deletable.
  perform test.become(v_user);
  v_export := public.export_my_data();
  perform test.ok(
    jsonb_array_length(v_export -> 'session_reviews') = 1,
    'the review is in the person''s own export');
  perform test.ok(
    jsonb_array_length(v_export -> 'format_preferences') = 1,
    'as is the learned format preference');

  perform test.become_recently_authenticated(v_user);
  perform public.delete_my_account('DELETE');
  perform test.become_service();
  perform test.equals(
    (select count(*)::int from public.session_reviews), 0,
    'deleting the account removes the reviews');
  perform test.equals(
    (select count(*)::int from public.user_format_affinity), 0,
    'and the learned format preferences');

  -- 10. The review never published or admitted content: the draft is still a
  -- draft, and the approved card is unchanged.
  perform test.equals(
    (select status::text from public.content_items where id = v_draft), 'draft',
    'a draft is still a draft: feedback cannot publish or admit content');
end;
$$;
