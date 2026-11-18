-- Migration 10: editorial governance — an append-only, hash-chained decision
-- ledger bound to immutable content revisions.
--
-- Decisions are written only through a SECURITY DEFINER function that sets the
-- reviewer identity (app.current_user_id()) and timestamp (now()) on the SERVER
-- — never from a client. High-impact content requires TWO DISTINCT authorised
-- reviewers; the same account cannot approve a revision twice. Each row carries
-- a SHA-256 hash of the previous row plus its own fields, so any later edit
-- breaks the chain (tamper-evidence). The table is append-only: no UPDATE/DELETE
-- policy or grant, and a trigger blocks mutation.
--
-- NOT APPLIED to any remote database by this change. Publication stays a
-- separate, explicit operation (moderate_content) — this ledger never publishes.

create type public.editorial_decision as enum ('approve', 'request_revision', 'reject', 'escalate');

create table public.editorial_decisions (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic insertion order; the hash chain is ordered by this, not by the
  -- timestamp (now() is transaction-stable, so several decisions recorded in one
  -- transaction share a decided_at) and not by the random id.
  seq bigint generated always as identity,
  content_id uuid not null references public.content_items (id) on delete cascade,
  -- Immutable revision binding: a decision is about one content_versions row.
  content_version_id uuid not null references public.content_versions (id) on delete restrict,
  -- Server-set identity; never a client-supplied name.
  reviewer_id uuid not null,
  decision public.editorial_decision not null,
  rationale text not null check (char_length(btrim(rationale)) between 10 and 2000),
  evidence_ref text check (evidence_ref is null or char_length(evidence_ref) <= 500),
  previous_decision_id uuid references public.editorial_decisions (id) on delete set null,
  -- Computed on the server at decision time (quorum met for this revision).
  publication_eligible boolean not null default false,
  -- Tamper-evidence: sha256(prev_hash || canonical fields).
  row_hash text not null,
  decided_at timestamptz not null default now()
);

create index editorial_decisions_content_idx on public.editorial_decisions (content_id);
create index editorial_decisions_version_idx on public.editorial_decisions (content_version_id);
create index editorial_decisions_reviewer_idx on public.editorial_decisions (reviewer_id);

alter table public.editorial_decisions enable row level security;

-- Staff may read the ledger; no one may write it through a policy (writes go
-- through the SECURITY DEFINER function only).
create policy editorial_decisions_select_staff on public.editorial_decisions
  for select using (app.is_staff());

grant select on public.editorial_decisions to authenticated;

-- Append-only: block UPDATE and DELETE for everyone (a superuser disabling the
-- trigger is the documented residual risk).
create or replace function app.editorial_decisions_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'editorial_decisions is append-only: % is not permitted', tg_op;
end;
$$;

create trigger editorial_decisions_no_update
  before update or delete on public.editorial_decisions
  for each row execute function app.editorial_decisions_append_only();

-- Whether the content's CURRENT revision meets the approval quorum. A new
-- revision has no approvals, so prior approvals are invalidated automatically.
create or replace function public.editorial_publication_eligible(p_content_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_current uuid;
  v_high boolean;
  v_required int;
  v_approvers int;
begin
  if not app.is_staff() then
    return false;
  end if;
  select current_version_id, is_high_impact into v_current, v_high
  from public.content_items where id = p_content_id;
  if v_current is null then
    return false;
  end if;
  v_required := case when v_high then 2 else 1 end;
  select count(distinct reviewer_id) into v_approvers
  from public.editorial_decisions
  where content_version_id = v_current and decision = 'approve';
  return v_approvers >= v_required;
end;
$$;

-- The one way a decision is recorded. Server sets identity and time.
create or replace function public.record_editorial_decision(
  p_content_id uuid,
  p_content_version_id uuid,
  p_decision public.editorial_decision,
  p_rationale text,
  p_evidence_ref text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := app.current_user_id();
  v_high boolean;
  v_version_content uuid;
  v_prev_id uuid;
  v_prev_hash text;
  v_required int;
  v_approvers int;
  v_eligible boolean := false;
  v_hash text;
  v_now timestamptz := now();
  v_id uuid;
begin
  if v_reviewer is null or not app.is_staff() then
    raise exception 'record_editorial_decision: reviewer is not an authorised staff member';
  end if;

  -- The revision must belong to the content (immutable binding).
  select content_id into v_version_content from public.content_versions where id = p_content_version_id;
  if v_version_content is null or v_version_content <> p_content_id then
    raise exception 'record_editorial_decision: revision does not belong to this content';
  end if;

  select is_high_impact into v_high from public.content_items where id = p_content_id;

  if p_decision = 'approve' then
    -- One account cannot approve the same revision twice.
    if exists (
      select 1 from public.editorial_decisions
      where content_version_id = p_content_version_id and reviewer_id = v_reviewer and decision = 'approve'
    ) then
      raise exception 'record_editorial_decision: this reviewer has already approved this revision';
    end if;
    v_required := case when v_high then 2 else 1 end;
    -- distinct approvers so far, plus this one
    select count(distinct reviewer_id) into v_approvers
    from public.editorial_decisions
    where content_version_id = p_content_version_id and decision = 'approve';
    v_eligible := (v_approvers + 1) >= v_required;
  end if;

  -- Chain: previous row for this content, by monotonic insertion order.
  select id, row_hash into v_prev_id, v_prev_hash
  from public.editorial_decisions
  where content_id = p_content_id
  order by seq desc
  limit 1;

  v_hash := encode(
    public.digest(
      coalesce(v_prev_hash, 'GENESIS') || '|' || p_content_id::text || '|' || p_content_version_id::text || '|' ||
      v_reviewer::text || '|' || p_decision::text || '|' || btrim(p_rationale) || '|' ||
      coalesce(p_evidence_ref, '') || '|' || v_eligible::text || '|' || v_now::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.editorial_decisions (
    content_id, content_version_id, reviewer_id, decision, rationale, evidence_ref,
    previous_decision_id, publication_eligible, row_hash, decided_at
  )
  values (
    p_content_id, p_content_version_id, v_reviewer, p_decision, p_rationale, p_evidence_ref,
    v_prev_id, v_eligible, v_hash, v_now
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Verify the hash chain for one content item (tamper detection). Returns true
-- if every row's hash recomputes from the previous row.
create or replace function public.editorial_ledger_valid(p_content_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
  v_prev text := 'GENESIS';
  v_expected text;
begin
  if not app.is_staff() then
    return false;
  end if;
  for r in
    select * from public.editorial_decisions
    where content_id = p_content_id
    order by seq asc
  loop
    v_expected := encode(
      public.digest(
        v_prev || '|' || r.content_id::text || '|' || r.content_version_id::text || '|' ||
        r.reviewer_id::text || '|' || r.decision::text || '|' || btrim(r.rationale) || '|' ||
        coalesce(r.evidence_ref, '') || '|' || r.publication_eligible::text || '|' || r.decided_at::text,
        'sha256'
      ),
      'hex'
    );
    if v_expected <> r.row_hash then
      return false;
    end if;
    v_prev := r.row_hash;
  end loop;
  return true;
end;
$$;

-- Staff may call the read helpers and record decisions; the function enforces
-- the staff check and sets identity itself. No client may write the table.
grant execute on function public.editorial_publication_eligible(uuid) to authenticated;
grant execute on function public.editorial_ledger_valid(uuid) to authenticated;
grant execute on function public.record_editorial_decision(uuid, uuid, public.editorial_decision, text, text) to authenticated;

comment on table public.editorial_decisions is
  'Append-only, hash-chained editorial decision ledger. Server-write-only via record_editorial_decision; high-impact needs two distinct reviewers; bound to an immutable content revision. Never publishes.';
