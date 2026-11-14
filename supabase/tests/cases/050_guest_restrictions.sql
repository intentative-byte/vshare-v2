-- A guest is a real account with its own rows, and may use the product.
do $$
declare
  v_guest uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  perform test.become(v_guest);

  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_guest), 1,
    'a guest has a profile of their own');

  update public.profiles set display_name = 'Visiting' where user_id = v_guest;
  perform test.equals(
    (select display_name from public.profiles where user_id = v_guest), 'Visiting',
    'a guest can set their own display name');

  update public.preferences set session_minutes = 15 where user_id = v_guest;
  perform test.equals(
    (select session_minutes from public.preferences where user_id = v_guest), 15,
    'a guest can set their own preferences');
end;
$$;

-- But a guest cannot make themselves public.
do $$
declare
  v_guest uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  perform test.become(v_guest);

  perform test.refuses(
    format('update public.profiles set is_public = true where user_id = %L', v_guest),
    'a guest cannot make their profile public');

  perform test.equals(
    (select is_public from public.profiles where user_id = v_guest), false,
    'the guest profile is still private');
end;
$$;

-- A guest is isolated from other accounts exactly as any other viewer is.
do $$
declare
  v_guest uuid;
  v_member uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_member := test.create_user('member@example.com');

  perform test.become(v_guest);
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_member), 0,
    'a guest cannot read another account''s profile');

  update public.preferences set session_minutes = 60 where user_id = v_member;

  perform test.become_service();
  perform test.equals(
    (select session_minutes from public.preferences where user_id = v_member), 10,
    'a guest cannot change another account''s preferences');
end;
$$;

-- The guest flag the policies rely on comes from the session, not from a
-- column a viewer could edit.
do $$
declare
  v_guest uuid;
  v_member uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_member := test.create_user('flag@example.com');

  perform test.become(v_guest);
  perform test.equals(app.is_guest(), true, 'a guest session reports is_guest');

  perform test.become(v_member);
  perform test.equals(app.is_guest(), false, 'a registered session does not');
end;
$$;
