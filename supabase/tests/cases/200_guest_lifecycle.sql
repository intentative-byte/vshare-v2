-- The guest purge: safe to run repeatedly, and it reports before it acts.
do $$
declare
  v_old_abandoned uuid;
  v_old_active uuid;
  v_recent uuid;
  v_converted uuid;
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
  v_result jsonb;
begin
  perform test.reset();
  v_mod := test.create_user('purge-mod@example.com');
  v_old_abandoned := test.create_user(null, true);
  v_old_active := test.create_user(null, true);
  v_recent := test.create_user(null, true);
  v_converted := test.create_user('converted@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('e1111111-1111-4111-8111-111111111111', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'e1111111-1111-4111-8111-111111111111', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('purge-test-card', v_topic, 'https://example.com/purge',
    'Example Publisher', 'A card for the purge test',
    'A summary that is long enough to satisfy the minimum length rule applied to every version.',
    array['Something worth taking away.'], 'Try it for one week.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- One old guest has been learning recently; the other has done nothing.
  perform test.become(v_old_active);
  perform public.set_interaction(v_card, 'complete');

  perform test.become_owner();
  update auth.users set created_at = now() - interval '60 days'
  where id in (v_old_abandoned, v_old_active, v_converted);

  -- A dry run changes nothing and shows its working.
  v_result := app.purge_stale_guests(interval '30 days', true);

  perform test.equals((v_result ->> 'dry_run')::boolean, true, 'a dry run says so');
  perform test.equals((v_result ->> 'eligible')::int, 1, 'only the abandoned guest is eligible');
  perform test.equals((v_result ->> 'deleted')::int, 0, 'and nothing is deleted');
  perform test.equals((v_result ->> 'kept_recent_activity')::int, 1,
    'the guest who has been learning is counted as kept');
  perform test.equals((v_result ->> 'kept_converted')::int, 1,
    'the converted account is counted as kept');
  perform test.equals(
    (select count(*)::int from auth.users where is_anonymous), 3,
    'all three guests are still there');

  -- Running it for real removes exactly the one it identified.
  v_result := app.purge_stale_guests(interval '30 days', false);

  perform test.equals((v_result ->> 'deleted')::int, 1, 'one guest is removed');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_old_abandoned), 0,
    'the abandoned guest is gone');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_old_active), 1,
    'the guest in the middle of learning is untouched');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_recent), 1,
    'a recent guest is untouched');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_converted), 1,
    'a converted account is untouched');
  perform test.equals(
    (select completed_at is not null from public.content_interactions
      where user_id = v_old_active), true,
    'and the active guest''s learning progress survives');

  -- Running it again is safe and finds nothing.
  v_result := app.purge_stale_guests(interval '30 days', false);
  perform test.equals((v_result ->> 'deleted')::int, 0,
    'running it again deletes nothing');
  perform test.equals((v_result ->> 'eligible')::int, 0,
    'because there is nothing left to delete');

  -- Every real run is audited, including one that found nothing: the
  -- evidence that the job ran matters as much as what it removed.
  perform test.equals(
    (select count(*)::int from public.audit_log where action = 'guests.purged'), 2,
    'both real runs are audited');
  perform test.equals(
    (select count(*)::int from public.audit_log
      where action = 'guests.purged' and (diff ->> 'deleted')::int = 0), 1,
    'including the one that deleted nothing');
end;
$$;

-- A guest that has converted is out of scope, whatever its age.
do $$
declare
  v_guest uuid;
  v_result jsonb;
begin
  perform test.reset();
  v_guest := test.create_user(null, true);

  perform test.become_owner();
  update auth.users set created_at = now() - interval '200 days' where id = v_guest;

  -- Conversion is the account ceasing to be anonymous and gaining an address.
  update auth.users set is_anonymous = false, email = 'now-registered@example.com'
  where id = v_guest;

  v_result := app.purge_stale_guests(interval '30 days', false);

  perform test.equals((v_result ->> 'deleted')::int, 0,
    'a converted account is never purged, however old');
  perform test.equals(
    (select count(*)::int from auth.users where id = v_guest), 1, 'it is still there');
end;
$$;

-- Resubmission after a correction.
do $$
declare
  v_mod uuid;
  v_member uuid;
  v_other uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('resub-mod@example.com');
  v_member := test.create_user('resub-member@example.com');
  v_other := test.create_user('resub-other@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('e2222222-2222-4222-8222-222222222222', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'e2222222-2222-4222-8222-222222222222', 'focus', 'Focus');

  perform test.become(v_member);
  v_card := public.submit_resource('a-resubmission-test', v_topic, 'https://example.com/resub',
    'Example Publisher', 'A submission that will be rejected',
    'A summary that is long enough to satisfy the minimum length rule applied to every version.',
    array['Something worth taking away.'], 'Try it for one week.');

  -- It cannot be corrected while it is still pending.
  perform test.refuses(
    format($q$select public.resubmit_content(%L, 'A corrected title here',
      'A corrected summary that is long enough to satisfy the minimum length rule applied.',
      array['A corrected takeaway.'], 'Try the corrected thing.', 'Example Publisher')$q$, v_card),
    'only a rejected submission can be corrected');

  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'reject', 'The summary copies the source.');

  -- Nobody else can correct it.
  perform test.become(v_other);
  perform test.refuses(
    format($q$select public.resubmit_content(%L, 'A corrected title here',
      'A corrected summary that is long enough to satisfy the minimum length rule applied.',
      array['A corrected takeaway.'], 'Try the corrected thing.', 'Example Publisher')$q$, v_card),
    'another account cannot correct someone else''s submission');

  perform test.become(v_member);
  perform public.resubmit_content(v_card, 'A corrected title here',
    'A corrected summary that is long enough to satisfy the minimum length rule applied.',
    array['A corrected takeaway.'], 'Try the corrected thing.', 'Example Publisher');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'pending'::public.content_status,
    'a corrected submission returns to the queue');
  perform test.equals(
    (select rejection_reason from public.content_items where id = v_card), null,
    'and the old rejection reason is cleared');
  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 2,
    'the correction is a new version, and the original is kept');

  perform test.become_owner();
  perform test.equals(
    (select count(*)::int from public.moderation_actions
      where content_id = v_card and action = 'submit'), 2,
    'both submissions are on the trail');
end;
$$;
