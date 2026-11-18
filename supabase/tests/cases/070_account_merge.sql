-- Account collision: a guest signs in with an email that already has an
-- account. The merge is recorded and the existing account's data is never
-- touched.
do $$
declare
  v_guest uuid;
  v_existing uuid;
  v_merge_id bigint;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_existing := test.create_user('already@example.com');

  -- The existing account has its own settings, which must survive.
  perform test.become(v_existing);
  update public.profiles set display_name = 'Original Owner' where user_id = v_existing;
  update public.preferences set session_minutes = 45, personalisation_enabled = false
    where user_id = v_existing;

  -- The guest had different settings.
  perform test.become(v_guest);
  update public.profiles set display_name = 'Just Visiting' where user_id = v_guest;
  update public.preferences set session_minutes = 5 where user_id = v_guest;

  -- Only the target account may merge a guest into itself.
  perform test.become(v_existing);
  v_merge_id := public.merge_guest_into(v_guest, v_existing);
  perform test.ok(v_merge_id is not null, 'the merge is recorded');

  perform test.equals(
    (select display_name from public.profiles where user_id = v_existing), 'Original Owner',
    'the existing display name is not overwritten');
  perform test.equals(
    (select session_minutes from public.preferences where user_id = v_existing), 45,
    'the existing preferences are not overwritten');
  perform test.equals(
    (select personalisation_enabled from public.preferences where user_id = v_existing), false,
    'the existing personalisation choice is not overwritten');

  perform test.equals(
    (select count(*)::int from public.account_merges
      where guest_user_id = v_guest and target_user_id = v_existing), 1,
    'the merge is visible to the target account');
end;
$$;

-- Nobody else may merge a guest into an account.
do $$
declare
  v_guest uuid;
  v_target uuid;
  v_attacker uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_target := test.create_user('victim2@example.com');
  v_attacker := test.create_user('attacker@example.com');

  perform test.become(v_attacker);
  perform test.refuses(
    format('select public.merge_guest_into(%L, %L)', v_guest, v_target),
    'a third party cannot merge a guest into someone else''s account');

  perform test.become(v_guest);
  perform test.refuses(
    format('select public.merge_guest_into(%L, %L)', v_guest, v_target),
    'the guest cannot merge itself into an account it does not own');
end;
$$;

-- The function refuses nonsensical merges.
do $$
declare
  v_member uuid;
  v_other_member uuid;
  v_guest uuid;
begin
  perform test.reset();
  v_member := test.create_user('m1@example.com');
  v_other_member := test.create_user('m2@example.com');
  v_guest := test.create_user(null, true);

  perform test.become(v_member);

  perform test.refuses(
    format('select public.merge_guest_into(%L, %L)', v_member, v_member),
    'an account cannot be merged into itself');
  perform test.refuses(
    format('select public.merge_guest_into(%L, %L)', v_other_member, v_member),
    'a registered account cannot be merged as though it were a guest');
  perform test.refuses(
    format('select public.merge_guest_into(%L, %L)', gen_random_uuid(), v_member),
    'an unknown account cannot be merged');

  perform test.become(v_guest);
  perform test.refuses(
    format('select public.merge_guest_into(%L, %L)', v_guest, v_guest),
    'a guest cannot be the target of a merge');
end;
$$;

-- The merge record is append-only and private to the target.
do $$
declare
  v_guest uuid;
  v_target uuid;
  v_other uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_target := test.create_user('t@example.com');
  v_other := test.create_user('o@example.com');

  perform test.become(v_target);
  perform public.merge_guest_into(v_guest, v_target);

  perform test.refuses(
    'update public.account_merges set moved = ''{"x":1}''::jsonb',
    'a merge record cannot be edited');
  perform test.refuses(
    'delete from public.account_merges',
    'a merge record cannot be deleted');

  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.account_merges), 0,
    'another account cannot see the merge record');
end;
$$;

-- Deleting the target account removes its merge records with it: the
-- append-only guard must not stand in the way of erasure.
do $$
declare
  v_guest uuid;
  v_target uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_target := test.create_user('erase@example.com');

  perform test.become(v_target);
  perform public.merge_guest_into(v_guest, v_target);

  perform test.become_owner();
  perform test.equals(
    (select count(*)::int from public.account_merges), 1, 'the merge record exists');

  delete from auth.users where id = v_target;

  perform test.equals(
    (select count(*)::int from public.account_merges), 0,
    'deleting the account removes its merge records');
end;
$$;
