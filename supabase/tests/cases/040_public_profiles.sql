-- A profile marked public is readable by others and by a signed-out visitor.
do $$
declare
  v_owner uuid;
  v_other uuid;
begin
  perform test.reset();
  v_owner := test.create_user('pub@example.com');
  v_other := test.create_user('other@example.com');

  perform test.become(v_owner);
  update public.profiles set is_public = true where user_id = v_owner;

  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_owner), 1,
    'a public profile is readable by another account');

  perform test.become_anonymous();
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_owner), 1,
    'a public profile is readable by a signed-out visitor');
end;
$$;

-- A private profile is not.
do $$
declare
  v_owner uuid;
  v_other uuid;
begin
  perform test.reset();
  v_owner := test.create_user('priv@example.com');
  v_other := test.create_user('nosy@example.com');

  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_owner), 0,
    'a private profile is not readable by another account');

  perform test.become_anonymous();
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_owner), 0,
    'a signed-out visitor cannot read a private profile');
  perform test.equals(
    (select count(*)::int from public.profiles), 0,
    'with no public profiles, a signed-out visitor sees none at all');
  perform test.refuses(
    'select count(*) from public.preferences',
    'a signed-out visitor is refused the preferences table outright');
end;
$$;
