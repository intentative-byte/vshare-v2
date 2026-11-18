-- Finance and health content needs a second pair of eyes.
do $$
declare
  v_author uuid;
  v_reviewer uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_author := test.create_user('fin-author@example.com');
  v_reviewer := test.create_user('fin-reviewer@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_author, 'moderator'), (v_reviewer, 'moderator');
  insert into public.categories (id, slug, name, description, is_high_impact)
  values ('66666666-6666-4666-8666-666666666666', 'personal-finance', 'Personal Finance',
          'Understanding money well enough to make your own decisions.', true);
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '66666666-6666-4666-8666-666666666666', 'budgeting', 'Budgeting');

  perform test.become(v_author);
  v_card := public.create_card('first-monthly-budget', v_topic, 'https://example.com/budget',
    'Example Publisher', 'Building your first monthly budget',
    'A plain walkthrough of listing income, fixed costs and everything left over, and what to do with the remainder.',
    array['Fixed costs are easier to cut once they are written down.'],
    'List every fixed monthly cost before the end of the week.');

  -- The flag follows the category, so it cannot be forgotten.
  perform test.equals(
    (select is_high_impact from public.content_items where id = v_card), true,
    'a card in a high-impact category is marked high impact automatically');

  perform test.become_service();
  perform public.record_link_check(v_card, true);

  -- The author cannot wave their own work through.
  perform test.become(v_author);
  perform test.refuses(
    format('select public.moderate_content(%L, ''approve'')', v_card),
    'the author of high-impact content cannot approve it themselves');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'draft'::public.content_status,
    'the card is still unpublished');

  -- A different moderator can.
  perform test.become(v_reviewer);
  perform public.moderate_content(v_card, 'approve');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'published'::public.content_status,
    'a second moderator can approve it');
  perform test.equals(
    (select reviewed_by from public.content_items where id = v_card), v_reviewer,
    'the second reviewer is the one recorded');
end;
$$;

-- Ordinary content does not need a second reviewer.
do $$
declare
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('ord-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description, is_high_impact)
  values ('77777777-7777-4777-8777-777777777777', 'productivity', 'Productivity',
          'Getting the things that matter done.', false);
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '77777777-7777-4777-8777-777777777777', 'planning', 'Planning');

  perform test.become(v_mod);
  v_card := public.create_card('planning-the-week', v_topic, 'https://example.com/planning',
    'Example Publisher', 'Planning a week in fifteen minutes',
    'A short routine for deciding what the week is actually for, rather than reacting to whatever arrives first.',
    array['Deciding in advance removes the daily argument with yourself.'],
    'Block fifteen minutes on Sunday evening.');

  perform test.become_service();
  perform public.record_link_check(v_card, true);

  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'published'::public.content_status,
    'ordinary content can be approved by the person who wrote it up');
end;
$$;
