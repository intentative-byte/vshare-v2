-- content_media: approved-only visibility, staff access, cross-user isolation
-- and server-write-only enforcement. Real functions, real PostgreSQL.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_other uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('media-mod@example.com');
  v_user := test.create_user('media-user@example.com');
  v_other := test.create_user('media-other@example.com');

  perform test.become_service();
  insert into public.user_roles(user_id, role) values (v_mod, 'moderator');
  insert into public.categories(id, slug, name, description)
  values ('a1a1a1a1-1a1a-41a1-81a1-1a1a1a1a1a1a', 'media-cat', 'Media Category', 'A category for media RLS tests.');
  v_topic := gen_random_uuid();
  insert into public.topics(id, category_id, slug, name)
  values (v_topic, 'a1a1a1a1-1a1a-41a1-81a1-1a1a1a1a1a1a', 'media-topic', 'Media Topic');

  -- A real published card to attach media to.
  perform test.become(v_mod);
  v_card := public.create_card('media-host-card', v_topic, 'https://example.com/media-host',
    'Example Publisher', 'A card hosting media',
    'A summary long enough to satisfy the minimum length rule the database applies to every card version here.',
    array['Something worth taking away.'], 'Do the thing it suggests.',
    'video', 'beginner', 8, 70);
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- Media rows: one published (reviewed + embeddable), one draft.
  perform test.become_service();
  insert into public.content_media(content_id, provider, provider_id, original_url, channel, title, embeddable, captions_available, status, reviewed_at)
  values (v_card, 'youtube', 'aircAruvnKk', 'https://www.youtube.com/watch?v=aircAruvnKk', '3Blue1Brown', 'But what is a neural network?', true, true, 'published', now());
  insert into public.content_media(content_id, provider, provider_id, original_url, channel, title, embeddable, status)
  values (v_card, 'youtube', 'WUvTyaaNkzM', 'https://www.youtube.com/watch?v=WUvTyaaNkzM', '3Blue1Brown', 'The essence of calculus', true, 'draft');

  -- A normal user sees the published media but NOT the draft.
  perform test.become(v_user);
  perform test.equals(
    (select count(*)::int from public.content_media where status = 'published'), 1,
    'a normal user sees published media');
  perform test.equals(
    (select count(*)::int from public.content_media where status = 'draft'), 0,
    'a normal user does not see draft media');

  -- A different user also cannot see the draft (cross-user isolation).
  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.content_media where status = 'draft'), 0,
    'another user cannot see unpublished media');

  -- Staff see every media row.
  perform test.become(v_mod);
  perform test.equals(
    (select count(*)::int from public.content_media), 2,
    'staff see all media (published and draft)');

  -- Parent-card visibility: published media on a DRAFT (unreadable) card must
  -- stay hidden from a normal user, even though the media itself is published.
  perform test.become(v_mod);
  declare v_draft_card uuid;
  begin
    v_draft_card := public.create_card('media-draft-card', v_topic, 'https://example.com/media-draft',
      'Example Publisher', 'A draft card hosting media',
      'A summary long enough to satisfy the minimum length rule the database applies to every card version here.',
      array['Something worth taking away.'], 'Do the thing it suggests.',
      'video', 'beginner', 8, 70);
    perform test.become_service();
    insert into public.content_media(content_id, provider, provider_id, original_url, channel, title, embeddable, status, reviewed_at)
    values (v_draft_card, 'youtube', 'yWO-cvGETRQ', 'https://www.youtube.com/watch?v=yWO-cvGETRQ', 'Kurzgesagt', 'Black holes', true, 'published', now());
    perform test.become(v_user);
    perform test.equals(
      (select count(*)::int from public.content_media where content_id = v_draft_card), 0,
      'published media on an unreadable (draft) parent card is hidden');
  end;

  -- Server-write-only: a client role cannot insert media.
  perform test.become(v_user);
  perform test.refuses(
    format('insert into public.content_media(content_id, provider, original_url, channel, title) values (%L, %L, %L, %L, %L)',
      v_card, 'youtube', 'https://www.youtube.com/watch?v=yWO-cvGETRQ', 'Someone', 'A title a client should not be able to add'),
    'a client role cannot insert media (server-write-only)');

  -- And cannot update a published media row.
  perform test.refuses(
    'update public.content_media set title = ''hacked'' where status = ''published''',
    'a client role cannot update media');
end;
$$;
