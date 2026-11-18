-- Migration 11: harden the other append-only audit tables against direct
-- privileged DELETE, closing the same class of gap the editorial ledger closed.
--
-- Found in the Phase 10.9A security acceptance: audit_log and account_merges
-- each declared "append-only" but their triggers fired on UPDATE only, so a role
-- with a DELETE privilege (service_role) could delete rows directly. (Clients
-- were already stopped by lacking the privilege; this is defence in depth for the
-- privileged roles.) The two tables need different handling:
--
--   * audit_log has NO legitimate deletion path — nothing cascades into it
--     (actor_id is ON DELETE SET NULL, an UPDATE its guard already allows), and
--     no code deletes it. So block DELETE outright, reusing its existing guard.
--   * account_merges keeps its UPDATE guard exactly as data_rights set it
--     (append_only_except_actor('guest_user_id') allows nulling guest_user_id
--     when a guest is erased, and blocks every other update). It had no DELETE
--     guard. It MUST stay deletable by cascade — target_user_id is ON DELETE
--     CASCADE, so erasing the target account deletes the merge row — so block a
--     DIRECT delete but allow the cascade, using the same parent-is-already-gone
--     test the editorial ledger uses. Blocking delete outright would reintroduce
--     the erasure-breaking bug (F4).
--
-- Additive and forward-only: no data is changed, no RLS is altered, the UPDATE
-- guards are unchanged. TRUNCATE remains a documented privileged-operator
-- residual (a TRUNCATE trigger cannot tell a cascade from a direct truncate; see
-- docs/VSHARES_SECURITY.md). NOT applied to any remote database by this change.

-- audit_log: the existing guard (app.append_only_except_actor) already raises on
-- DELETE; it just was not wired to the DELETE event. Fire it on DELETE too.
drop trigger audit_log_no_update on public.audit_log;
create trigger audit_log_no_update
  before update or delete on public.audit_log
  for each row execute function app.append_only_except_actor('actor_id');

-- account_merges: add a DELETE-only guard (the UPDATE guard stays as is).
-- SECURITY DEFINER so the parent check is not subject to the caller's row
-- visibility. A direct delete (the target account still exists) is refused; the
-- cascade from erasing the target account (parent already gone) is allowed.
create or replace function app.account_merges_no_direct_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id = old.target_user_id) then
    raise exception 'account_merges is append-only: DELETE is not permitted';
  end if;
  return old;
end;
$$;

create trigger account_merges_no_delete
  before delete on public.account_merges
  for each row execute function app.account_merges_no_direct_delete();
