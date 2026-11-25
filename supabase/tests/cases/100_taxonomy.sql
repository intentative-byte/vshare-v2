-- Categories and topics live in the database and are managed only by an
-- administrator, with every change audited.
do $$
declare
  v_admin uuid;
  v_plain uuid;
  v_category uuid;
  v_topic uuid;
begin
  perform test.reset();
  v_admin := test.create_user('tax-admin@example.com');
  v_plain := test.create_user('tax-plain@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  -- A plain account cannot shape the catalogue.
  perform test.become(v_plain);
  perform test.refuses(
    'select public.upsert_category(''sneaky'', ''Sneaky'', ''A category nobody approved.'')',
    'a plain account cannot create a category');
  perform test.refuses(
    'insert into public.categories (slug, name, description) values (''x'', ''X'', ''Direct insert attempt.'')',
    'a plain account cannot insert a category directly');

  -- An administrator can.
  perform test.become(v_admin);
  v_category := public.upsert_category('productivity', 'Productivity',
    'Getting the things that matter done, without theatre.', 5, false);
  perform test.ok(v_category is not null, 'an administrator can create a category');

  v_topic := public.upsert_topic(v_category, 'attention-and-focus', 'Attention and focus', 1);
  perform test.ok(v_topic is not null, 'an administrator can create a topic');

  perform test.equals(
    (select count(*)::int from public.audit_log where action = 'category.create'), 1,
    'creating a category is audited');
  perform test.equals(
    (select count(*)::int from public.audit_log where action = 'topic.create'), 1,
    'creating a topic is audited');

  -- Edits go through the same route.
  perform public.upsert_category('productivity', 'Productivity',
    'A better description of the same thing.', 5, false, v_category);
  perform test.equals(
    (select description from public.categories where id = v_category),
    'A better description of the same thing.',
    'an administrator can edit a category');
end;
$$;

-- The taxonomy is readable by everyone, archived entries by staff only.
do $$
declare
  v_admin uuid;
  v_visitor uuid;
  v_category uuid;
  v_topic uuid;
begin
  perform test.reset();
  v_admin := test.create_user('tax2-admin@example.com');
  v_visitor := test.create_user('tax2-visitor@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  perform test.become(v_admin);
  v_category := public.upsert_category('communication', 'Communication',
    'Being understood, in writing and in the room.');
  v_topic := public.upsert_topic(v_category, 'clear-writing', 'Clear writing');

  -- Anyone, signed in or not, can browse.
  perform test.become(v_visitor);
  perform test.equals(
    (select count(*)::int from public.categories where id = v_category), 1,
    'a signed-in visitor can read categories');
  perform test.equals(
    (select count(*)::int from public.topics where id = v_topic), 1,
    'a signed-in visitor can read topics');

  perform test.become_anonymous();
  perform test.equals(
    (select count(*)::int from public.categories where id = v_category), 1,
    'a signed-out visitor can read categories');

  -- Archiving hides a category from the public but not from staff.
  perform test.become(v_admin);
  perform public.set_category_archived(v_category, true);

  perform test.become_anonymous();
  perform test.equals(
    (select count(*)::int from public.categories where id = v_category), 0,
    'an archived category disappears from public browsing');

  perform test.become(v_admin);
  perform test.equals(
    (select count(*)::int from public.categories where id = v_category), 1,
    'staff can still see an archived category');
end;
$$;
