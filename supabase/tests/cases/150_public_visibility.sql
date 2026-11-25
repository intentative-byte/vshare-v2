-- A published card, and everything needed to show it with attribution, is
-- readable by anyone.
do $$
declare
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
  v_title text;
  v_source text;
begin
  perform test.reset();
  v_mod := test.create_user('vis-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'technology-and-ai', 'Technology and AI',
          'How the tools shaping your work actually function.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'ai-foundations', 'AI foundations');

  perform test.become(v_mod);
  v_card := public.create_card('how-tokens-work', v_topic, 'https://example.com/tokens',
    'Example Publisher', 'What a language model is actually reading',
    'Text is split into tokens before a model sees it, which explains several behaviours that otherwise look arbitrary.',
    array['A model sees tokens, not words or letters.', 'Token boundaries explain odd spelling mistakes.'],
    'Paste a sentence into a tokeniser and count the tokens.',
    'article', 'beginner', 6, 80, false, 'A Named Author');

  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- A signed-out visitor gets the card, its current version and its source.
  perform test.become_anonymous();

  perform test.equals(
    (select count(*)::int from public.content_items where id = v_card), 1,
    'a published card is readable by a signed-out visitor');

  select v.title, c.source_url into v_title, v_source
  from public.content_items c
  join public.content_versions v on v.id = c.current_version_id
  where c.id = v_card;

  perform test.equals(v_title, 'What a language model is actually reading',
    'the current version is readable');
  perform test.equals(v_source, 'https://example.com/tokens', 'the source link is readable');

  perform test.equals(
    (select source_name from public.content_versions where id =
      (select current_version_id from public.content_items where id = v_card)),
    'Example Publisher',
    'the publisher is readable, so attribution can always be shown');
  perform test.equals(
    (select source_author from public.content_versions where id =
      (select current_version_id from public.content_items where id = v_card)),
    'A Named Author',
    'the author is readable too');

  -- Archiving takes it back out of public view.
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'archive', 'The source was taken down.');

  perform test.become_anonymous();
  perform test.equals(
    (select count(*)::int from public.content_items where id = v_card), 0,
    'an archived card disappears from public view');
  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 0,
    'and so does its text');
end;
$$;

-- A duplicate source link is refused while a card for it is live.
do $$
declare
  v_mod uuid;
  v_topic uuid;
begin
  perform test.reset();
  v_mod := test.create_user('dup-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'habits', 'Habits');

  perform test.become(v_mod);
  perform public.create_card('first-write-up', v_topic, 'https://example.com/same',
    'Example Publisher', 'The first write-up of this resource',
    'A summary of the resource that is long enough to satisfy the minimum length rule applied by the database.',
    array['Something worth remembering from it.'], 'Try the first suggestion in it.');

  perform test.refuses(
    format($q$select public.create_card('second-write-up', %L, 'https://example.com/same',
      'Example Publisher', 'A second write-up of the same thing',
      'Another summary of the same resource, also long enough to satisfy the minimum length rule.',
      array['Something else worth remembering.'], 'Try the second suggestion.')$q$, v_topic),
    'the same source link cannot be added twice while one card for it is live');
end;
$$;
