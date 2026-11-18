-- Recording what someone did with a card.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_state jsonb;
begin
  perform test.reset();
  v_mod := test.create_user('int-mod@example.com');
  v_user := test.create_user('int-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f1111111-1111-4111-8111-111111111111', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f1111111-1111-4111-8111-111111111111', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('a-published-card', v_topic, 'https://example.com/pub',
    'Example Publisher', 'A card that has been published',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 8, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);

  -- Opening is not completing.
  v_state := public.set_interaction(v_card, 'open');
  perform test.equals((v_state ->> 'opened')::boolean, true, 'opening is recorded');
  perform test.equals((v_state ->> 'completed')::boolean, false,
    'opening a card does not complete it');

  v_state := public.set_interaction(v_card, 'complete');
  perform test.equals((v_state ->> 'completed')::boolean, true, 'completing is recorded');
  perform test.equals((v_state ->> 'changed')::boolean, true, 'the first completion counts');

  -- Repeating it changes nothing.
  v_state := public.set_interaction(v_card, 'complete');
  perform test.equals((v_state ->> 'changed')::boolean, false,
    'completing twice does not count twice');

  perform test.become_owner();
  perform test.equals(
    (select completions::int from public.content_stats where content_id = v_card), 1,
    'the completion counter moved exactly once');
  perform test.equals(
    (select opens::int from public.content_stats where content_id = v_card), 1,
    'the open counter moved exactly once');
  perform test.ok(
    (select completed_minutes from public.content_interactions
      where user_id = v_user and content_id = v_card) = 8,
    'the card''s length at the time of completion is kept');
end;
$$;

-- Saving and liking can be undone; completing cannot.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_state jsonb;
begin
  perform test.reset();
  v_mod := test.create_user('undo-mod@example.com');
  v_user := test.create_user('undo-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f2222222-2222-4222-8222-222222222222', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f2222222-2222-4222-8222-222222222222', 'habits', 'Habits');

  perform test.become(v_mod);
  v_card := public.create_card('undoable-card-here', v_topic, 'https://example.com/undo',
    'Example Publisher', 'A card to save and unsave',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Something worth taking away.'], 'Try it once.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);

  v_state := public.set_interaction(v_card, 'save', true);
  perform test.equals((v_state ->> 'saved')::boolean, true, 'a card can be saved');

  v_state := public.set_interaction(v_card, 'save', false);
  perform test.equals((v_state ->> 'saved')::boolean, false, 'a save can be undone');

  v_state := public.set_interaction(v_card, 'like', true);
  perform test.equals((v_state ->> 'liked')::boolean, true, 'a card can be liked');

  v_state := public.set_interaction(v_card, 'skip', true);
  perform test.equals((v_state ->> 'skipped')::boolean, true, 'a card can be skipped');

  -- Completing something skipped clears the skip: the later action wins.
  v_state := public.set_interaction(v_card, 'complete');
  perform test.equals((v_state ->> 'skipped')::boolean, false,
    'completing a skipped card clears the skip');

  perform test.become_owner();
  perform test.equals(
    (select saves::int from public.content_stats where content_id = v_card), 1,
    'the save counter counted the save once, and the undo did not subtract a phantom');
end;
$$;

-- Only published content can be interacted with.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_draft uuid;
begin
  perform test.reset();
  v_mod := test.create_user('draft-mod@example.com');
  v_user := test.create_user('draft-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f3333333-3333-4333-8333-333333333333', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f3333333-3333-4333-8333-333333333333', 'planning', 'Planning');

  perform test.become(v_mod);
  v_draft := public.create_card('an-unpublished-card', v_topic, 'https://example.com/draft',
    'Example Publisher', 'A card still in draft',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Nothing anyone should see yet.'], 'Nothing yet.');

  perform test.become(v_user);
  perform test.refuses(
    format('select public.set_interaction(%L, ''complete'')', v_draft),
    'an unpublished card cannot be completed');
  perform test.refuses(
    format('select public.set_interaction(%L, ''save'')', v_draft),
    'an unpublished card cannot be saved');
  perform test.equals(
    public.record_impressions(array[v_draft], null), 0,
    'an unpublished card records no impression');
end;
$$;

-- Progress cannot be written directly, only through the function.
do $$
declare
  v_user uuid;
  v_other uuid;
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_user := test.create_user('direct-user@example.com');
  v_other := test.create_user('direct-other@example.com');
  v_mod := test.create_user('direct-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('f4444444-4444-4444-8444-444444444444', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'f4444444-4444-4444-8444-444444444444', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('another-published-card', v_topic, 'https://example.com/another',
    'Example Publisher', 'Another published card',
    'A summary that is long enough to satisfy the minimum length rule applied to every content version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);
  perform test.refuses(
    format($q$insert into public.content_interactions (user_id, content_id, completed_at)
      values (%L, %L, now())$q$, v_user, v_card),
    'progress cannot be inserted directly');

  perform public.set_interaction(v_card, 'complete');

  perform test.refuses(
    format('update public.content_interactions set impressions = 9999 where user_id = %L', v_user),
    'counters cannot be edited directly');

  -- One person's history is invisible to another.
  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.content_interactions where user_id = v_user), 0,
    'another account cannot read someone''s learning history');
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_user), 0,
    'nor their preference memory');
end;
$$;
