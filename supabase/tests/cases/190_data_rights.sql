-- Export: everything about the person, and nothing about anyone else.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_other uuid;
  v_topic uuid;
  v_card uuid;
  v_export jsonb;
begin
  perform test.reset();
  v_mod := test.create_user('exp-mod@example.com');
  v_user := test.create_user('exp-user@example.com');
  v_other := test.create_user('exp-other@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('d1111111-1111-4111-8111-111111111111', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'd1111111-1111-4111-8111-111111111111', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('export-test-card', v_topic, 'https://example.com/exp',
    'Example Publisher', 'A card used to test the export',
    'A summary that is long enough to satisfy the minimum length rule applied to every version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- The person does a few things.
  perform test.become(v_user);
  update public.profiles set display_name = 'Exported Person' where user_id = v_user;
  update public.preferences set analytics_consent = 'granted' where user_id = v_user;
  perform public.set_declared_topics(array[v_topic]);
  perform public.set_interaction(v_card, 'complete');
  perform public.set_interaction(v_card, 'save', true);
  perform public.report_content(v_card, 'inaccurate', 'The second claim is off.');
  -- Interactions do not themselves write analytics events; the interface
  -- records those, so one is recorded here to prove the export carries them.
  perform public.record_event('card_completed', 'topic', 'Focus');

  -- Someone else does things too, which must not appear.
  perform test.become(v_other);
  update public.profiles set display_name = 'Somebody Else' where user_id = v_other;
  perform public.set_interaction(v_card, 'complete');

  perform test.become(v_user);
  v_export := public.export_my_data();

  perform test.equals(v_export ->> 'format', 'vshares.export.v1',
    'the export states its format');
  perform test.equals(v_export -> 'account' ->> 'email', 'exp-user@example.com',
    'the account is included');
  perform test.equals(v_export -> 'profile' ->> 'display_name', 'Exported Person',
    'the profile is included');
  perform test.equals(jsonb_array_length(v_export -> 'topics'), 1,
    'preference memory is included');
  perform test.equals(jsonb_array_length(v_export -> 'interactions'), 1,
    'learning interactions are included');
  perform test.equals(jsonb_array_length(v_export -> 'reports'), 1,
    'reports are included');
  perform test.equals(jsonb_array_length(v_export -> 'consent_history'), 1,
    'consent history is included');
  perform test.equals(jsonb_array_length(v_export -> 'analytics_events') > 0, true,
    'events collected under consent are included');

  -- Nothing belonging to anyone else.
  perform test.equals(
    (v_export::text like '%Somebody Else%'), false,
    'no other person appears anywhere in the export');
  perform test.equals(
    (v_export::text like '%exp-other@example.com%'), false,
    'nor their address');
end;
$$;

-- The export cannot be pointed at another account.
do $$
declare
  v_a uuid;
  v_b uuid;
  v_export jsonb;
begin
  perform test.reset();
  v_a := test.create_user('scope-a@example.com');
  v_b := test.create_user('scope-b@example.com');

  perform test.become(v_a);
  v_export := public.export_my_data();

  perform test.equals(v_export -> 'account' ->> 'id', v_a::text,
    'the export always describes the caller');

  perform test.become_anonymous();
  perform test.refuses(
    'select public.export_my_data()',
    'a signed-out visitor cannot export anything');
end;
$$;

-- Deletion needs confirmation and a recent authentication.
do $$
declare
  v_user uuid;
begin
  perform test.reset();
  v_user := test.create_user('delete-me@example.com');

  perform test.become(v_user);

  perform test.refuses(
    'select public.delete_my_account(''yes'')',
    'deletion without the confirmation word is refused');

  -- The session has no record of a recent authentication.
  perform test.refuses(
    'select public.delete_my_account(''DELETE'')',
    'a registered account must have authenticated recently');

  perform test.equals(
    (select count(*)::int from auth.users where id = v_user), 1,
    'the account is still there');
end;
$$;

-- With a recent authentication, deletion removes everything personal.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_topic uuid;
  v_card uuid;
  v_draft uuid;
  v_result jsonb;
begin
  perform test.reset();
  v_mod := test.create_user('del-mod@example.com');
  v_user := test.create_user('del-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('d2222222-2222-4222-8222-222222222222', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'd2222222-2222-4222-8222-222222222222', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('deletion-test-card', v_topic, 'https://example.com/del',
    'Example Publisher', 'A card used to test deletion',
    'A summary that is long enough to satisfy the minimum length rule applied to every version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_user);
  perform public.set_declared_topics(array[v_topic]);
  perform public.set_interaction(v_card, 'complete');
  perform public.set_interaction(v_card, 'save', true);
  perform public.report_content(v_card, 'broken_link', 'The link is dead.');
  v_draft := public.submit_resource('a-pending-submission', v_topic, 'https://example.com/sub',
    'Example Publisher', 'A submission still pending',
    'A summary that is long enough to satisfy the minimum length rule applied to every version.',
    array['Something worth taking away.'], 'Try it for one week.');

  -- A session that proves a recent authentication.
  perform test.become_recently_authenticated(v_user);
  v_result := public.delete_my_account('DELETE');

  perform test.equals((v_result ->> 'deleted')::boolean, true, 'the account is deleted');

  perform test.become_owner();

  perform test.equals(
    (select count(*)::int from auth.users where id = v_user), 0, 'the account is gone');
  perform test.equals(
    (select count(*)::int from public.profiles where user_id = v_user), 0, 'the profile is gone');
  perform test.equals(
    (select count(*)::int from public.preferences where user_id = v_user), 0,
    'the preferences are gone');
  perform test.equals(
    (select count(*)::int from public.user_topics where user_id = v_user), 0,
    'the preference memory is gone');
  perform test.equals(
    (select count(*)::int from public.content_interactions where user_id = v_user), 0,
    'the learning history is gone');
  perform test.equals(
    (select count(*)::int from public.feed_sessions where user_id = v_user), 0,
    'the sessions are gone');
  perform test.equals(
    (select count(*)::int from public.content_items where id = v_draft), 0,
    'the pending submission is gone, having no public value');
  perform test.equals(
    (select count(*)::int from public.content_reports where reporter_id = v_user), 0,
    'the reporter reference is cleared');

  -- The published card they completed stays, as does the audit trail,
  -- with no reference to them.
  perform test.equals(
    (select status from public.content_items where id = v_card), 'published'::public.content_status,
    'published content is untouched');
  perform test.equals(
    (select count(*)::int from public.audit_log where action = 'account.deleted'), 1,
    'the deletion is auditable');
  perform test.equals(
    (select actor_id from public.audit_log where action = 'account.deleted'), null::uuid,
    'and the audit entry holds no identifier for them');
  perform test.ok(
    (select target_id from public.audit_log where action = 'account.deleted') <> v_user::text,
    'the audit entry records a digest, not the account id');
end;
$$;

-- No orphaned identifier is left anywhere.
do $$
declare
  v_guest uuid;
  v_target uuid;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);
  v_target := test.create_user('merge-target@example.com');

  perform test.become(v_target);
  perform public.merge_guest_into(v_guest, v_target);

  perform test.become_owner();
  perform test.equals(
    (select guest_user_id from public.account_merges limit 1), v_guest,
    'the merge records which guest it was');

  delete from auth.users where id = v_guest;

  perform test.equals(
    (select guest_user_id from public.account_merges limit 1), null::uuid,
    'deleting the guest clears the identifier, leaving nothing orphaned');
  perform test.equals(
    (select count(*)::int from public.account_merges), 1,
    'while the record that a merge happened survives');
end;
$$;

-- A guest can delete their own account without reauthenticating.
do $$
declare
  v_guest uuid;
  v_result jsonb;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);

  perform test.become(v_guest);
  v_result := public.delete_my_account('DELETE');

  perform test.equals((v_result ->> 'deleted')::boolean, true,
    'a guest can delete their account without a second factor they do not have');
  perform test.equals(
    (v_result -> 'removed' ->> 'was_guest')::boolean, true,
    'and the audit records that it was a guest');
end;
$$;
