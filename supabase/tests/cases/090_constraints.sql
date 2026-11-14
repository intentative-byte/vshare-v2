-- Input that reaches the database is still checked there, so a bug in the
-- application layer cannot write nonsense.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('cons@example.com');
  perform test.become(v_user);

  perform test.refuses(
    format('update public.profiles set handle = ''ab'' where user_id = %L', v_user),
    'a handle shorter than three characters is refused');
  perform test.refuses(
    format('update public.profiles set handle = ''Has Capitals'' where user_id = %L', v_user),
    'a handle with spaces or capitals is refused');
  perform test.refuses(
    format('update public.profiles set handle = %L where user_id = %L', repeat('a', 25), v_user),
    'a handle longer than twenty-four characters is refused');
  perform test.refuses(
    format('update public.preferences set session_minutes = 1 where user_id = %L', v_user),
    'a session length below the minimum is refused');
  perform test.refuses(
    format('update public.preferences set session_minutes = 600 where user_id = %L', v_user),
    'a session length above the maximum is refused');
  perform test.refuses(
    format('update public.profiles set display_name = %L where user_id = %L', repeat('x', 61), v_user),
    'an over-long display name is refused');
end;
$$;

-- Two accounts cannot share a handle.
do $$
declare
  v_a uuid;
  v_b uuid;
begin
  perform test.reset();
  v_a := test.create_user('uniq1@example.com');
  v_b := test.create_user('uniq2@example.com');

  perform test.become(v_b);
  perform test.refuses(
    format('update public.profiles set handle = ''uniq1'' where user_id = %L', v_b),
    'a handle already in use is refused');
end;
$$;
