-- Test harness: stands in for the parts of a Supabase project that the
-- platform creates rather than our migrations.
--
-- Running this, then the migrations, against a plain PostgreSQL database
-- gives a faithful environment for testing policies and functions: the same
-- schema, the same roles, and the same `request.jwt.claims` setting that
-- PostgREST sets per request.
--
-- It is NOT part of the product and is never applied to a real project.
-- What it cannot reproduce is the auth service itself (magic-link issuing,
-- session cookies, OAuth); those need the full stack and are tested there.

create extension if not exists pgcrypto;

-- Roles PostgREST connects as.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create schema if not exists auth;

-- Only the columns our code depends on, with the same names and types the
-- platform uses.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  is_anonymous boolean not null default false,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Helpers the test suite uses to act as a given viewer, mirroring what
-- PostgREST does when it hands a request to the database.
create schema if not exists test;

create or replace function test.become(p_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_is_anonymous boolean;
begin
  execute 'reset role';

  select is_anonymous into v_is_anonymous from auth.users where id = p_user_id;

  if v_is_anonymous is null then
    raise exception 'test.become: no such user %', p_user_id;
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'is_anonymous', v_is_anonymous)::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function test.become_anonymous()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end;
$$;

create or replace function test.become_service()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role service_role';
end;
$$;

-- Assertions. A failing assertion raises, which stops the file and fails the
-- run; there is no way for a test to pass silently.
create or replace function test.ok(p_condition boolean, p_what text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'ASSERTION FAILED: %', p_what;
  end if;

  raise notice '  ok: %', p_what;
end;
$$;

create or replace function test.equals(p_actual anyelement, p_expected anyelement, p_what text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_what, p_expected, p_actual;
  end if;

  raise notice '  ok: %', p_what;
end;
$$;

-- Asserts that a statement is refused. Used for every "must not be able to"
-- case, so a missing policy fails the suite rather than passing quietly.
create or replace function test.refuses(p_sql text, p_what text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception
    when others then
      raise notice '  ok: % (refused: %)', p_what, left(sqlerrm, 60);
      return;
  end;

  raise exception 'ASSERTION FAILED: % (the statement was allowed)', p_what;
end;
$$;

-- Creates an account the way the platform does, so the signup trigger runs.
-- Returns to the unrestricted session user, for setup between assertions.
create or replace function test.become_owner()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function test.create_user(
  p_email text default null,
  p_is_anonymous boolean default false,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  insert into auth.users (id, email, is_anonymous, raw_user_meta_data)
  values (v_id, p_email, p_is_anonymous, p_meta);

  return v_id;
end;
$$;

-- Returns the database to an empty state. Called at the start of every test
-- block so that each one is independent: a block can never pass or fail
-- because of accounts another block created.
create or replace function test.reset()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  delete from auth.users;

  -- Catalogue rows do not belong to an account, so they survive the delete
  -- above and would leak between test blocks.
  truncate table
    public.content_reports,
    public.moderation_actions,
    public.content_topics,
    public.content_versions,
    public.content_items,
    public.topics,
    public.categories,
    public.audit_log,
    public.analytics_events,
    public.analytics_daily,
    public.analytics_rollups,
    public.learner_milestones,
    public.session_reviews,
    public.user_format_affinity
  restart identity cascade;
end;
$$;

-- Acts as a user whose session proves a recent authentication, which is
-- what a destructive action requires. Mirrors the `amr` claim the auth
-- service issues after a sign-in.
create or replace function test.become_recently_authenticated(
  p_user_id uuid,
  p_seconds_ago integer default 60
)
returns void
language plpgsql
as $$
declare
  v_is_anonymous boolean;
begin
  execute 'reset role';

  select is_anonymous into v_is_anonymous from auth.users where id = p_user_id;

  if v_is_anonymous is null then
    raise exception 'test.become_recently_authenticated: no such user %', p_user_id;
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::text,
      'is_anonymous', v_is_anonymous,
      'amr', json_build_array(
        json_build_object(
          'method', 'otp',
          'timestamp', extract(epoch from now())::bigint - p_seconds_ago
        )
      )
    )::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;
