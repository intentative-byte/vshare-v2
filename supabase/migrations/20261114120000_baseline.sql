-- VSHARES baseline migration.
--
-- Creates only what every later migration depends on: the identity helpers
-- that row-level security policies call, and a shared trigger function.
--
-- Policies never call the auth provider's functions directly. They use
-- app.current_user_id() and app.is_guest(), so replacing the provider means
-- rewriting these two functions rather than every policy
-- (decision D-027, docs/VSHARES_ARCHITECTURE.md section 9).
--
-- No product tables are created here. They arrive with the milestone that
-- needs them: identity in Milestone 2, catalogue in Milestone 3,
-- interactions in Milestone 4, analytics in Milestone 7.

create extension if not exists pgcrypto;

create schema if not exists app;

comment on schema app is
  'VSHARES internal helpers. The only place that reads provider-specific session claims.';

revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;

-- The current viewer, or null when there is no session.
create or replace function app.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  -- The setting is absent for an unauthenticated request and an empty
  -- string for a privileged one, so it is emptied to null before the cast:
  -- casting '' to jsonb raises.
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

comment on function app.current_user_id() is
  'Identity of the current viewer. Replace this function to change auth provider.';

-- True for an anonymous (guest) account that has not been upgraded.
create or replace function app.is_guest()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_anonymous')::boolean,
    false
  );
$$;

comment on function app.is_guest() is
  'Whether the current viewer is a guest. Guests may learn and save, but not submit or report.';

-- Shared trigger for tables that track their own last change.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Append-only tables (audit log, events, XP) get this guard, so history
-- cannot be edited even by a privileged client.
create or replace function app.forbid_update_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Table %.% is append-only', tg_table_schema, tg_table_name;
end;
$$;

grant execute on function app.current_user_id(), app.is_guest() to authenticated, anon;

-- Nothing is readable or writable by default. Every later migration grants
-- exactly what its policies need.
alter default privileges in schema public revoke all on tables from anon, authenticated;
