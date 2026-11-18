-- Data rights: export, deletion, consent history and the guest lifecycle.
--
-- A data inventory came first (docs/VSHARES_DATA_INVENTORY.md). It found a
-- real problem: account_merges.guest_user_id held a user identifier with no
-- foreign key, so deleting that guest account would have left the
-- identifier behind for ever. That is fixed here before anything else.

-- ------------------------------------------- orphaned identifier, fixed --

alter table public.account_merges
  alter column guest_user_id drop not null;

alter table public.account_merges
  add constraint account_merges_guest_fkey
  foreign key (guest_user_id) references auth.users (id) on delete set null;

comment on column public.account_merges.guest_user_id is
  'Nulled when the guest account is deleted, so no identifier is left orphaned.';

-- The append-only guard has to allow that one change, or deleting a guest
-- account would fail. Same rule as every other append-only table here.
drop trigger if exists account_merges_no_update on public.account_merges;

create trigger account_merges_no_update
before update on public.account_merges
for each row execute function app.append_only_except_actor('guest_user_id');

-- The earlier one-argument version is replaced by the version below, which
-- reports before it deletes. Dropped so a call with no arguments is not
-- ambiguous.
drop function if exists app.purge_stale_guests(interval);

-- ----------------------------------------------------- consent history --

create table public.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null check (kind in ('analytics')),
  granted boolean not null,
  occurred_at timestamptz not null default now()
);

comment on table public.consent_events is
  'When consent was given or withdrawn. Evidence for the person and for us.';

create index consent_events_user_idx on public.consent_events (user_id, occurred_at desc);

create or replace function app.record_consent_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.analytics_consent is distinct from old.analytics_consent
     and new.analytics_consent <> 'unset' then
    insert into public.consent_events (user_id, kind, granted)
    values (new.user_id, 'analytics', new.analytics_consent = 'granted');
  end if;

  return new;
end;
$$;

create trigger preferences_record_consent
after update on public.preferences
for each row execute function app.record_consent_change();

-- ------------------------------------------------- reauthentication ---

-- When the current session last proved who it belongs to.
--
-- The auth service records each authentication in the `amr` claim with a
-- timestamp. A destructive action needs a recent one, so a borrowed or
-- long-lived session cannot delete an account.
create or replace function app.last_authenticated_at()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select to_timestamp(max((entry ->> 'timestamp')::bigint))
  from jsonb_array_elements(
    coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'amr',
      '[]'::jsonb
    )
  ) as entry;
$$;

-- ------------------------------------------------------------- export --

-- Everything held about the person, in one document.
--
-- Scoped to the caller: it takes no argument, so it cannot be pointed at
-- anyone else. It deliberately excludes the internal moderation trail,
-- which is about our decisions rather than their data, and of course
-- anything belonging to another person.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_export jsonb;
begin
  if v_user is null then
    raise exception 'export_my_data: no session';
  end if;

  select jsonb_build_object(
    'format', 'vshares.export.v1',
    'exported_at', now(),
    'account', (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'is_guest', u.is_anonymous,
        'created_at', u.created_at
      )
      from auth.users u where u.id = v_user
    ),
    'profile', (
      select to_jsonb(p) - 'user_id'
      from public.profiles p where p.user_id = v_user
    ),
    'preferences', (
      select to_jsonb(pr) - 'user_id'
      from public.preferences pr where pr.user_id = v_user
    ),
    'consent_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', c.kind, 'granted', c.granted, 'occurred_at', c.occurred_at
      ) order by c.occurred_at)
      from public.consent_events c where c.user_id = v_user
    ), '[]'::jsonb),
    'roles', coalesce((
      select jsonb_agg(r.role order by r.role)
      from public.user_roles r where r.user_id = v_user
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'topic', t.name, 'declared', ut.declared,
        'affinity', ut.affinity, 'level', ut.level
      ) order by t.name)
      from public.user_topics ut
      join public.topics t on t.id = ut.topic_id
      where ut.user_id = v_user
    ), '[]'::jsonb),
    'interactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'card', ci.content_id, 'slug', c.slug,
        'impressions', ci.impressions, 'opened_at', ci.opened_at,
        'completed_at', ci.completed_at, 'saved_at', ci.saved_at,
        'liked_at', ci.liked_at, 'skipped_at', ci.skipped_at,
        'feedback', ci.feedback, 'completed_minutes', ci.completed_minutes
      ) order by ci.created_at)
      from public.content_interactions ci
      join public.content_items c on c.id = ci.content_id
      where ci.user_id = v_user
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'started_at', s.started_at, 'ended_at', s.ended_at, 'size', s.size
      ) order by s.started_at)
      from public.feed_sessions s where s.user_id = v_user
    ), '[]'::jsonb),
    'recommendations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'card', r.content_id, 'surface', r.surface, 'position', r.position,
        'score', r.score, 'components', r.components, 'shown_at', r.shown_at
      ) order by r.shown_at)
      from public.recommendations r where r.user_id = v_user
    ), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'status', c.status, 'source_url', c.source_url,
        'created_at', c.created_at, 'rejection_reason', c.rejection_reason,
        'title', v.title, 'summary', v.summary
      ) order by c.created_at)
      from public.content_items c
      left join public.content_versions v on v.id = c.current_version_id
      where c.submitted_by = v_user
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'card', rp.content_id, 'reason', rp.reason, 'note', rp.note,
        'status', rp.status, 'created_at', rp.created_at
      ) order by rp.created_at)
      from public.content_reports rp where rp.reporter_id = v_user
    ), '[]'::jsonb),
    'analytics_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', e.name, 'occurred_at', e.occurred_at, 'value', e.value
      ) order by e.occurred_at)
      from public.analytics_events e where e.user_id = v_user
    ), '[]'::jsonb),
    'account_merges', coalesce((
      select jsonb_agg(jsonb_build_object('created_at', m.created_at))
      from public.account_merges m where m.target_user_id = v_user
    ), '[]'::jsonb)
  )
  into v_export;

  return v_export;
end;
$$;

-- ----------------------------------------------------------- deletion --

-- Deletes the caller's account.
--
-- Takes no user argument, so it cannot be pointed at anyone else. A
-- registered account must have authenticated recently; a guest has no
-- second factor to offer and is deleted on request.
--
-- What goes: everything keyed to the person. What stays: content they
-- contributed that is already published, with their name removed, and the
-- moderation and audit trails, with the actor removed. Those are records of
-- our decisions, not of them.
create or replace function public.delete_my_account(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_is_guest boolean;
  v_last_auth timestamptz;
  v_counts jsonb;
  v_digest text;
begin
  if v_user is null then
    raise exception 'delete_my_account: no session';
  end if;

  if p_confirm is distinct from 'DELETE' then
    raise exception 'delete_my_account: confirmation required';
  end if;

  select is_anonymous into v_is_guest from auth.users where id = v_user;

  if v_is_guest is null then
    raise exception 'delete_my_account: unknown account';
  end if;

  -- A registered account proves who it is again before anything is
  -- destroyed. A guest cannot, and has nothing to prove.
  if not v_is_guest then
    v_last_auth := app.last_authenticated_at();

    if v_last_auth is null or v_last_auth < now() - interval '15 minutes' then
      raise exception 'delete_my_account: sign in again to confirm this';
    end if;
  end if;

  -- Counted before deletion, for the audit entry. Counts only; nothing
  -- that could identify the person afterwards.
  select jsonb_build_object(
    'interactions', (select count(*) from public.content_interactions where user_id = v_user),
    'sessions', (select count(*) from public.feed_sessions where user_id = v_user),
    'recommendations', (select count(*) from public.recommendations where user_id = v_user),
    'topics', (select count(*) from public.user_topics where user_id = v_user),
    'reports', (select count(*) from public.content_reports where reporter_id = v_user),
    'submissions', (select count(*) from public.content_items where submitted_by = v_user),
    'analytics_events', (select count(*) from public.analytics_events where user_id = v_user),
    'was_guest', v_is_guest
  ) into v_counts;

  -- A one-way digest, so the same account cannot be deleted twice without
  -- anyone noticing, while the audit log holds no identifier.
  v_digest := encode(sha256(convert_to(v_user::text, 'UTF8')), 'hex');

  -- Unpublished submissions are personal data with no public value: they go.
  delete from public.content_items
  where submitted_by = v_user and status in ('draft', 'pending', 'rejected');

  -- The audit entry is written first and deliberately carries no actor: a
  -- row referencing the account would either fail once it is gone, or
  -- preserve the identifier the deletion exists to remove.
  insert into public.audit_log (actor_id, action, target_type, target_id, diff)
  values (null, 'account.deleted', 'account_digest', v_digest, v_counts);

  -- Everything else keyed to the person goes with the account, by cascade
  -- or by being set to null, as the data inventory records.
  delete from auth.users where id = v_user;

  return jsonb_build_object('deleted', true, 'removed', v_counts);
end;
$$;

-- -------------------------------------------------- guest lifecycle ---

-- Removes guest accounts that have been abandoned.
--
-- Safe to run repeatedly, and it reports rather than deletes unless asked.
-- An account is eligible only when it is still anonymous, was created
-- before the cutoff, and has done nothing since: a guest in the middle of
-- learning is never swept up, however old the account is.
create or replace function app.purge_stale_guests(
  p_older_than interval default interval '30 days',
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - p_older_than;
  v_examined integer;
  v_eligible uuid[];
  v_kept_converted integer;
  v_kept_active integer;
  v_deleted integer := 0;
begin
  select count(*) into v_examined from auth.users where is_anonymous;

  -- Converted accounts are no longer anonymous, so they are already out of
  -- scope. Counted so the evidence shows they were considered.
  select count(*) into v_kept_converted
  from auth.users u
  where not u.is_anonymous and u.created_at < v_cutoff;

  select coalesce(array_agg(u.id), '{}'::uuid[]) into v_eligible
  from auth.users u
  where u.is_anonymous
    and u.created_at < v_cutoff
    and u.email is null
    and not exists (
      select 1 from public.content_interactions i
      where i.user_id = u.id and greatest(i.created_at, i.updated_at) >= v_cutoff
    )
    and not exists (
      select 1 from public.feed_sessions s
      where s.user_id = u.id and s.started_at >= v_cutoff
    );

  select count(*) into v_kept_active
  from auth.users u
  where u.is_anonymous
    and u.created_at < v_cutoff
    and not (u.id = any (v_eligible));

  if not p_dry_run then
    delete from auth.users where id = any (v_eligible);
    get diagnostics v_deleted = row_count;

    perform app.audit('guests.purged', 'maintenance', null, jsonb_build_object(
      'deleted', v_deleted, 'cutoff', v_cutoff
    ));
  end if;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'cutoff', v_cutoff,
    'guests_examined', v_examined,
    'eligible', coalesce(array_length(v_eligible, 1), 0),
    'deleted', v_deleted,
    'kept_recent_activity', v_kept_active,
    'kept_converted', v_kept_converted
  );
end;
$$;

-- -------------------------------------------------------- resubmission --

-- A rejected submission can be corrected and sent back.
create or replace function public.resubmit_content(
  p_content_id uuid,
  p_title text,
  p_summary text,
  p_takeaways text[],
  p_next_step text,
  p_source_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := app.current_user_id();
  v_item public.content_items;
  v_version_id uuid;
  v_next_no integer;
begin
  if v_user is null or app.is_guest() then
    raise exception 'resubmit_content: create an account to submit a resource';
  end if;

  select * into v_item from public.content_items where id = p_content_id;

  if v_item.id is null or v_item.submitted_by is distinct from v_user then
    raise exception 'resubmit_content: that is not your submission';
  end if;

  if v_item.status <> 'rejected' then
    raise exception 'resubmit_content: only a rejected submission can be corrected';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_next_no
  from public.content_versions where content_id = p_content_id;

  insert into public.content_versions (
    content_id, version_no, title, summary, takeaways, next_step, source_name, created_by
  )
  values (
    p_content_id, v_next_no, p_title, p_summary, p_takeaways, p_next_step,
    p_source_name, v_user
  )
  returning id into v_version_id;

  update public.content_items
  set current_version_id = v_version_id,
      status = 'pending',
      rejection_reason = null,
      reviewed_by = null,
      reviewed_at = null
  where id = p_content_id;

  insert into public.moderation_actions (content_id, actor_id, action)
  values (p_content_id, v_user, 'submit');
end;
$$;

-- ---------------------------------------------------------- row security --

alter table public.consent_events enable row level security;

create policy consent_events_select_own
on public.consent_events for select
to authenticated
using (user_id = app.current_user_id());

grant select on public.consent_events to authenticated;

grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account(text) to authenticated;
grant execute on function public.resubmit_content(uuid, text, text, text[], text, text)
to authenticated;

-- Maintenance stays with privileged callers.
revoke all on function app.purge_stale_guests(interval, boolean) from public, anon, authenticated;
grant execute on function app.purge_stale_guests(interval, boolean) to service_role;
