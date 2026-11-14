-- Deleting an account removes everything that belongs to it, by
-- construction rather than by remembering to clean up.
do $$
declare
  v_user uuid;
  v_keeper uuid;
begin
  perform test.reset();
  v_user := test.create_user('going@example.com');
  v_keeper := test.create_user('staying@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_user, 'moderator');

  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_user), 1, 'the account exists');

  delete from auth.users where id = v_user;

  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_user), 0,
    'the profile is gone');
  perform test.equals(
    (select count(*)::int from public.preferences where user_id = v_user), 0,
    'the preferences are gone');
  perform test.equals(
    (select count(*)::int from public.user_roles where user_id = v_user), 0,
    'the role grants are gone');
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_keeper), 1,
    'another account is untouched');
end;
$$;

-- Stale guest accounts are purged; recent ones and registered ones are not.
do $$
declare
  v_old_guest uuid;
  v_new_guest uuid;
  v_member uuid;
  v_deleted integer;
begin
  perform test.reset();
  v_old_guest := test.create_user(null, true);
  v_new_guest := test.create_user(null, true);
  v_member := test.create_user('keeps@example.com');

  update auth.users set created_at = now() - interval '45 days' where id = v_old_guest;
  update auth.users set created_at = now() - interval '45 days' where id = v_member;

  v_deleted := app.purge_stale_guests();

  perform test.equals(v_deleted, 1, 'one stale guest is purged');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_old_guest), 0, 'the stale guest is gone');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_new_guest), 1, 'a recent guest is kept');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_member), 1,
    'an old registered account is kept');
end;
$$;

-- The purge is not something a viewer can call.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('nopurge@example.com');
  perform test.become(v_user);

  perform test.refuses(
    'select app.purge_stale_guests()',
    'a viewer cannot purge guest accounts');
end;
$$;
