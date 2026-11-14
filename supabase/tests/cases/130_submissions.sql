-- A member of the public proposing a resource.
do $$
declare
  v_member uuid;
  v_guest uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_member := test.create_user('sub-member@example.com');
  v_guest := test.create_user(null, true);

  perform test.become_service();
  insert into public.categories (id, slug, name, description)
  values ('88888888-8888-4888-8888-888888888888', 'communication', 'Communication',
          'Being understood, in writing and in the room.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '88888888-8888-4888-8888-888888888888', 'clear-writing', 'Clear writing');

  -- A guest may learn, but not put things into the catalogue queue.
  perform test.become(v_guest);
  perform test.refuses(
    format($q$select public.submit_resource('guest-submission-slug', %L, 'https://example.com/g',
      'Example', 'A title that is long enough',
      'A summary that is long enough to satisfy the minimum length rule applied by the database itself.',
      array['A takeaway long enough to count.'], 'Do the thing described.')$q$, v_topic),
    'a guest cannot submit a resource');

  -- A registered account can, and the result is always pending.
  perform test.become(v_member);
  v_card := public.submit_resource('plain-english-guide', v_topic, 'https://example.com/plain',
    'Example Publisher', 'Writing that people actually understand',
    'A guide to removing the padding from business writing, with before-and-after examples of real sentences.',
    array['Shorter sentences are not simpler ideas, just clearer ones.'],
    'Rewrite one paragraph you sent this week.');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'pending'::public.content_status,
    'a submission is created pending, never published');
  perform test.equals(
    (select origin from public.content_items where id = v_card), 'user_submitted'::public.content_origin,
    'a submission is marked as user submitted');
  perform test.equals(
    (select submitted_by from public.content_items where id = v_card), v_member,
    'the submitter is recorded');
  -- The moderation trail is staff-only, so it is checked from outside the
  -- submitter's session.
  perform test.become_owner();
  perform test.equals(
    (select count(*)::int from public.moderation_actions where content_id = v_card and action = 'submit'), 1,
    'the submission is on the moderation trail');
end;
$$;

-- A submitter cannot promote their own submission.
do $$
declare
  v_member uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_member := test.create_user('promo@example.com');

  perform test.become_service();
  insert into public.categories (id, slug, name, description)
  values ('99999999-9999-4999-8999-999999999999', 'communication', 'Communication', 'Being understood.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '99999999-9999-4999-8999-999999999999', 'listening', 'Listening');

  perform test.become(v_member);
  v_card := public.submit_resource('listening-better-guide', v_topic, 'https://example.com/listen',
    'Example Publisher', 'Listening without waiting to speak',
    'What changes when you stop preparing your reply while the other person is still talking, and how to practise it.',
    array['Most people listen to reply rather than to understand.'],
    'In your next conversation, pause before replying.');

  perform test.refuses(
    format('select public.moderate_content(%L, ''approve'')', v_card),
    'a submitter cannot approve their own submission');
  perform test.refuses(
    format('update public.content_items set status = ''published'' where id = %L', v_card),
    'a submitter cannot publish by updating the row directly');
  perform test.refuses(
    format('select public.record_link_check(%L, true)', v_card),
    'a submitter cannot mark their own link as checked');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'pending'::public.content_status,
    'the submission is still pending');
end;
$$;

-- The submitter can follow their submission; nobody else can see it.
do $$
declare
  v_member uuid;
  v_other uuid;
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_member := test.create_user('owner-sub@example.com');
  v_other := test.create_user('nosy-sub@example.com');
  v_mod := test.create_user('queue-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'habits', 'Habits');

  perform test.become(v_member);
  v_card := public.submit_resource('tiny-habits-overview', v_topic, 'https://example.com/tiny',
    'Example Publisher', 'Starting far smaller than feels useful',
    'Why habits that feel too small to matter are the ones that survive a bad week, and how to pick one.',
    array['A habit you can do on your worst day is the one that lasts.'],
    'Choose a version of your habit that takes under a minute.');

  perform test.equals(
    (select count(*)::int from public.content_items where id = v_card), 1,
    'the submitter can see their own pending submission');

  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.content_items where id = v_card), 0,
    'another account cannot see a pending submission');
  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 0,
    'nor its text');

  perform test.become_anonymous();
  perform test.equals(
    (select count(*)::int from public.content_items where id = v_card), 0,
    'a signed-out visitor cannot see a pending submission');

  perform test.become(v_mod);
  perform test.equals(
    (select count(*)::int from public.content_items where id = v_card), 1,
    'a moderator sees it in the queue');

  -- Rejection reaches the submitter.
  perform public.moderate_content(v_card, 'reject', 'The source requires a subscription.');

  perform test.become(v_member);
  perform test.equals(
    (select rejection_reason from public.content_items where id = v_card),
    'The source requires a subscription.',
    'the submitter can read why it was rejected');
end;
$$;
