-- Audit tables are append-only against DIRECT deletes, even for a privileged
-- role, while legitimate erasure cascades still succeed. Regression cover for
-- the Phase 10.9A hardening (migration 11).
do $$
declare
  v_actor uuid;
  v_guest uuid;
  v_target uuid;
begin
  perform test.reset();
  v_actor := test.create_user('audit-actor@example.com');
  v_guest := test.create_user('merge-guest@example.com', true);
  v_target := test.create_user('merge-target@example.com', false);

  -- ---- audit_log: no legitimate delete path, so a direct delete is blocked ----
  perform test.become_service();
  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (v_actor, 'test.action', 'thing', v_actor::text);

  -- service_role HAS the delete privilege, so this proves the trigger blocks it,
  -- not merely a missing grant.
  perform test.refuses('delete from public.audit_log', 'a direct delete of audit_log is blocked by the trigger');

  -- But erasing the actor's account must still null the actor (ON DELETE SET
  -- NULL is an UPDATE the guard allows) — the entry survives, de-identified.
  delete from auth.users where id = v_actor;
  perform test.ok(
    exists (select 1 from public.audit_log where actor_id is null),
    'erasing the actor nulls the audit entry rather than deleting it');

  -- ---- account_merges: cascade-deletable for erasure, but no direct delete ----
  perform test.become_service();
  insert into public.account_merges (guest_user_id, target_user_id) values (v_guest, v_target);

  perform test.refuses(
    format('delete from public.account_merges where guest_user_id = %L', v_guest),
    'a direct delete of account_merges is blocked while the target account exists');
  perform test.refuses(
    format('update public.account_merges set moved = ''{"tampered":true}''::jsonb where guest_user_id = %L', v_guest),
    'account_merges content cannot be updated');

  -- Erasing the GUEST account nulls guest_user_id (an allowed update) and keeps
  -- the record — the new delete guard must not interfere with that path.
  delete from auth.users where id = v_guest;
  perform test.ok(
    exists (select 1 from public.account_merges where target_user_id = v_target and guest_user_id is null),
    'erasing the guest nulls guest_user_id and keeps the merge record');

  -- Erasing the TARGET account cascades the merge record away (parent gone), so
  -- the right to erasure is not blocked by the append-only guard.
  delete from auth.users where id = v_target;
  perform test.ok(
    not exists (select 1 from public.account_merges where target_user_id = v_target),
    'erasing the target account cascades the merge record away');
end;
$$;
