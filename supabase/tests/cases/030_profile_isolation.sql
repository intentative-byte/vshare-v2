-- Two distinct users. Neither may read or change the other's rows.
do $$
declare
  v_a uuid;
  v_b uuid;
begin
  perform test.reset();
  v_a := test.create_user('a@example.com');
  v_b := test.create_user('b@example.com');

  perform test.become(v_a);

  perform test.equals(
    (select count(*)::int from public.profiles), 1,
    'a viewer sees only their own profile');
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_b), 0,
    'another account''s profile is not readable');
  perform test.equals(
    (select count(*)::int from public.preferences where user_id = v_b), 0,
    'another account''s preferences are not readable');

  -- An update that targets another row must change nothing.
  update public.profiles set display_name = 'hijacked' where user_id = v_b;
  perform test.equals(
    (select count(*)::int from public.profiles where display_name = 'hijacked'), 0,
    'updating another account''s profile changes no rows');

  update public.preferences set session_minutes = 55 where user_id = v_b;

  perform test.become_service();
  perform test.equals(
    (select display_name from public.profiles where user_id = v_b), null,
    'the other profile is genuinely unchanged');
  perform test.equals(
    (select session_minutes from public.preferences where user_id = v_b), 10,
    'the other preferences are genuinely unchanged');
end;
$$;

-- A viewer may change their own row.
do $$
declare
  v_a uuid;
begin
  perform test.reset();
  v_a := test.create_user('own@example.com');
  perform test.become(v_a);

  update public.profiles set display_name = 'Mine', handle = 'mine_handle' where user_id = v_a;
  perform test.equals(
    (select display_name from public.profiles where user_id = v_a), 'Mine',
    'a viewer can update their own display name');
  perform test.equals(
    (select handle from public.profiles where user_id = v_a), 'mine_handle',
    'a viewer can change their own handle');

  update public.preferences set session_minutes = 25, personalisation_enabled = false where user_id = v_a;
  perform test.equals(
    (select session_minutes from public.preferences where user_id = v_a), 25,
    'a viewer can update their own preferences');
end;
$$;

-- Columns that identify or date the row are not the viewer's to change.
do $$
declare
  v_a uuid;
  v_b uuid;
begin
  perform test.reset();
  v_a := test.create_user('imm1@example.com');
  v_b := test.create_user('imm2@example.com');
  perform test.become(v_a);

  perform test.refuses(
    format('update public.profiles set user_id = %L where user_id = %L', v_b, v_a),
    'a viewer cannot reassign their profile to another account');
  perform test.refuses(
    format('update public.profiles set created_at = now() - interval ''1 year'' where user_id = %L', v_a),
    'a viewer cannot rewrite when their profile was created');
end;
$$;

-- Rows are created by the trigger and removed by account deletion only.
do $$
declare
  v_a uuid;
begin
  perform test.reset();
  v_a := test.create_user('nodel@example.com');
  perform test.become(v_a);

  perform test.refuses(
    format('insert into public.profiles (user_id, handle) values (%L, ''sneaky'')', gen_random_uuid()),
    'a viewer cannot insert a profile');

  perform test.refuses(
    format('delete from public.profiles where user_id = %L', v_a),
    'a viewer cannot delete their profile row directly');
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_a), 1,
    'the profile row is still there');
end;
$$;
