-- A handle is ours to assign. Two accounts whose provider data suggests the
-- same handle must both be created: a collision must never abort signup.
-- This is the defect C1 found in the legacy code.
do $$
declare
  v_first uuid;
  v_second uuid;
  v_third uuid;
begin
  perform test.reset();
  v_first := test.create_user('sam@example.com');
  v_second := test.create_user('sam@other.example.com');
  v_third := test.create_user(null, true, '{"preferred_username":"sam"}'::jsonb);

  perform test.equals(
    (select count(distinct handle)::int from public.profiles
      where user_id in (v_first, v_second, v_third)), 3,
    'three colliding seeds produce three distinct handles');

  perform test.equals(
    (select handle from public.profiles where user_id = v_first), 'sam',
    'the first account keeps the plain handle');

  perform test.ok(
    (select handle from public.profiles where user_id = v_second) <> 'sam',
    'the second account gets a different handle');
end;
$$;

-- A seed that is empty or unusable still produces a valid handle.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user(null, true, '{}'::jsonb);

  perform test.ok(
    (select handle from public.profiles where user_id = v_user) ~ '^[a-z0-9_]{3,24}$',
    'a guest with no metadata still gets a valid handle');
end;
$$;

-- Characters that are not allowed in a handle are stripped, not rejected.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('A.Weird+Name@example.com');

  perform test.ok(
    (select handle from public.profiles where user_id = v_user) ~ '^[a-z0-9_]{3,24}$',
    'an awkward email local part is normalised into a valid handle');
end;
$$;
