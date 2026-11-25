-- Creating an account provisions exactly one profile and one preferences
-- row, with a handle we generate ourselves.
do $$
declare
  v_user uuid;
  v_handle text;
begin
  perform test.reset();
  v_user := test.create_user('ada@example.com', false, '{"full_name":"Ada L"}'::jsonb);

  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_user), 1,
    'signup creates one profile row');
  perform test.equals(
    (select count(*)::int from public.preferences where user_id = v_user), 1,
    'signup creates one preferences row');

  select handle into v_handle from public.profiles where user_id = v_user;
  perform test.ok(v_handle ~ '^[a-z0-9_]{3,24}$', 'the generated handle is well formed');
  perform test.equals(v_handle, 'ada', 'the handle is seeded from the email local part');

  perform test.equals(
    (select display_name from public.profiles where user_id = v_user), 'Ada L',
    'the display name comes from the provider metadata');
  perform test.equals(
    (select is_public from public.profiles where user_id = v_user), false,
    'a new profile is private by default');
  perform test.equals(
    (select personalisation_enabled from public.preferences where user_id = v_user), true,
    'personalisation starts on');
  perform test.equals(
    (select analytics_consent from public.preferences where user_id = v_user), 'unset'::public.analytics_consent,
    'analytics consent starts unset');
end;
$$;
