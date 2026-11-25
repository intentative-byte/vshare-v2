-- Roles live in a table, are readable by their owner, and cannot be
-- self-granted by any user-scoped client.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('plain@example.com');
  perform test.become(v_user);

  perform test.equals(public.has_role('admin'), false, 'a new account holds no admin role');
  perform test.equals(public.has_role('moderator'), false, 'a new account holds no moderator role');

  perform test.refuses(
    format('insert into public.user_roles (user_id, role) values (%L, ''admin'')', v_user),
    'a viewer cannot grant themselves a role by inserting a row');

  perform test.refuses(
    format('select public.grant_role(%L, ''admin'')', v_user),
    'a viewer cannot grant themselves a role through grant_role');
end;
$$;

-- An administrator can grant and revoke.
do $$
declare
  v_admin uuid;
  v_target uuid;
begin
  perform test.reset();
  v_admin := test.create_user('admin@example.com');
  v_target := test.create_user('target@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  perform test.become(v_admin);
  perform test.equals(public.has_role('admin'), true, 'the administrator holds the role');

  perform public.grant_role(v_target, 'moderator');

  perform test.become(v_target);
  perform test.equals(public.has_role('moderator'), true, 'the granted role takes effect');
  perform test.equals(
    (select count(*)::int from public.user_roles where user_id = v_target), 1,
    'a viewer can see their own role');

  perform test.become(v_admin);
  perform public.revoke_role(v_target, 'moderator');

  perform test.become(v_target);
  perform test.equals(public.has_role('moderator'), false, 'the revoked role is gone');
end;
$$;

-- The last administrator cannot be removed, by anyone.
do $$
declare
  v_admin uuid;
begin
  perform test.reset();
  v_admin := test.create_user('solo-admin@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  perform test.become(v_admin);
  perform test.refuses(
    format('select public.revoke_role(%L, ''admin'')', v_admin),
    'the last administrator cannot be removed');
  perform test.equals(public.has_role('admin'), true, 'they still hold the role');
end;
$$;

-- A moderator is not an administrator.
do $$
declare
  v_moderator uuid;
  v_other uuid;
begin
  perform test.reset();
  v_moderator := test.create_user('mod@example.com');
  v_other := test.create_user('victim@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_moderator, 'moderator');

  perform test.become(v_moderator);
  perform test.equals(public.has_role('admin'), false, 'a moderator is not an administrator');
  perform test.refuses(
    format('select public.grant_role(%L, ''admin'')', v_other),
    'a moderator cannot grant roles');
end;
$$;

-- A moderator may read profiles for moderation; a plain account may not.
do $$
declare
  v_moderator uuid;
  v_subject uuid;
begin
  perform test.reset();
  v_subject := test.create_user('subject@example.com');
  v_moderator := test.create_user('mod2@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_moderator, 'moderator');

  perform test.become(v_moderator);
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_subject), 1,
    'a moderator can read another profile');

  perform test.become(v_subject);
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_moderator), 0,
    'a plain account still cannot');
end;
$$;
