-- Catalogue: categories, topics, value cards with version history,
-- moderation, reporting and the audit log.
--
-- Rules this migration enforces in the database, not merely in the
-- application:
--   1. Nothing is published without a named reviewer.
--   2. High-impact content (finance, health) needs a reviewer who is not
--      the person who submitted it.
--   3. A user submission is always created pending, whatever the client says.
--   4. Published content is readable by anyone; a submission is readable by
--      its author and by moderators, and by nobody else.
--   5. Every administrative action is written to an append-only audit log.

-- ---------------------------------------------------------------- types --

create type public.content_kind as enum (
  'external_resource',  -- a curated link with our own summary
  'lesson',             -- reserved: original teaching content
  'article',
  'video',
  'audio'
);

create type public.content_origin as enum ('curated', 'user_submitted', 'creator', 'ingested');
create type public.content_status as enum ('draft', 'pending', 'published', 'rejected', 'archived');
create type public.content_format as enum ('article', 'video', 'podcast', 'course', 'tool', 'book');
create type public.content_level as enum ('beginner', 'intermediate', 'advanced');
create type public.report_reason as enum (
  'broken_link', 'inaccurate', 'harmful', 'spam', 'copyright', 'other'
);
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.moderation_action as enum (
  'submit', 'approve', 'reject', 'edit', 'archive', 'restore', 'resolve_report'
);

-- An append-only table still has to let an account be erased.
--
-- When a user is deleted, the actor column on their past actions is set to
-- null. That is an UPDATE, so a blanket append-only guard would block the
-- deletion entirely. This guard allows exactly that one change -- a named
-- actor column moving to null -- and refuses every other edit.
create or replace function app.append_only_except_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_key text;
  v_allowed text[] := tg_argv::text[];
  v_generated text[];
begin
  if tg_op = 'DELETE' then
    raise exception 'Table %.% is append-only', tg_table_schema, tg_table_name;
  end if;

  -- A stored generated column is not yet computed in NEW during a BEFORE
  -- trigger, so it always looks changed. It is derived from other columns,
  -- which are checked, so there is nothing to protect here.
  select coalesce(array_agg(a.attname::text), array[]::text[])
  into v_generated
  from pg_catalog.pg_attribute a
  where a.attrelid = tg_relid and a.attgenerated <> '' and a.attnum > 0;

  for v_key in select jsonb_object_keys(v_old) loop
    continue when v_key = any (v_generated);

    if v_old -> v_key is distinct from v_new -> v_key then
      if not (v_key = any (v_allowed)) or v_new -> v_key <> 'null'::jsonb then
        raise exception 'Table %.% is append-only (column % cannot be changed)',
          tg_table_schema, tg_table_name, v_key;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

-- ------------------------------------------------------------ taxonomy --

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  description text not null check (char_length(btrim(description)) between 10 and 300),
  sort_order integer not null default 0,
  -- Finance, health and legal: a second pair of eyes before publication,
  -- and an "educational, not advice" notice in the interface.
  is_high_impact boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function app.set_updated_at();

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger topics_set_updated_at
before update on public.topics
for each row execute function app.set_updated_at();

create index topics_category_idx on public.topics (category_id, sort_order);

-- ------------------------------------------------------- content items --

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 8 and 90),
  kind public.content_kind not null default 'external_resource',
  origin public.content_origin not null default 'curated',
  status public.content_status not null default 'draft',
  primary_topic_id uuid not null references public.topics (id) on delete restrict,
  current_version_id uuid,
  format public.content_format not null default 'article',
  level public.content_level not null default 'beginner',
  estimated_minutes integer not null default 5 check (estimated_minutes between 1 and 600),
  -- Editorial judgement, 0-100. Replaced by an outcome-derived score when
  -- there is enough data to compute one.
  quality_score integer not null default 50 check (quality_score between 0 and 100),
  -- The canonical link. Part of the item's identity, so duplicates are
  -- refused across the catalogue.
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 2000),
  is_ai_assisted boolean not null default false,
  is_high_impact boolean not null default false,
  submitted_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 3 and 500),
  link_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Nothing reaches the public without having been reviewed, and without a
  -- version to show.
  --
  -- The constraint names the review *time*, not the reviewer: when a
  -- moderator's account is deleted their name is cleared from past work, and
  -- that must not make published cards unlawful rows. Who reviewed what is
  -- recorded in moderation_actions and the audit log, which anonymise the
  -- same way.
  constraint content_published_needs_review check (
    status <> 'published'
    or (reviewed_at is not null
        and published_at is not null and current_version_id is not null)
  ),
  -- A card whose link has never been checked cannot go live. The check is a
  -- real request to the source, recorded by scripts/check-links.mjs; writing
  -- the date by hand would be falsifying it.
  constraint content_published_needs_link_check check (
    status <> 'published' or link_checked_at is not null
  ),
  constraint content_rejected_needs_reason check (
    status <> 'rejected' or rejection_reason is not null
  )
);

create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function app.set_updated_at();

-- One live card per source link. A rejected or archived card does not
-- block a later, better write-up of the same resource.
create unique index content_items_source_url_idx
on public.content_items (lower(source_url))
where status in ('draft', 'pending', 'published');

create index content_items_published_idx
on public.content_items (primary_topic_id, published_at desc)
where status = 'published';

create index content_items_queue_idx
on public.content_items (created_at)
where status = 'pending';

create index content_items_submitter_idx on public.content_items (submitted_by);

-- ---------------------------------------------------- content versions --

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  version_no integer not null check (version_no > 0),
  title text not null check (char_length(btrim(title)) between 10 and 120),
  summary text not null check (char_length(btrim(summary)) between 40 and 600),
  -- One to three things the reader takes away. Written by us, in our words.
  takeaways text[] not null
    check (array_length(takeaways, 1) between 1 and 3),
  -- What to actually do with it. The difference between reading and value.
  next_step text not null check (char_length(btrim(next_step)) between 10 and 300),
  source_name text not null check (char_length(btrim(source_name)) between 2 and 120),
  source_author text check (source_author is null or char_length(btrim(source_author)) between 2 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_id, version_no)
);

comment on table public.content_versions is
  'Immutable snapshots of what a card said. Insert only: a correction is a new version.';

create trigger content_versions_no_update
before update or delete on public.content_versions
for each row execute function app.append_only_except_actor('created_by');

alter table public.content_items
add constraint content_items_current_version_fkey
foreign key (current_version_id) references public.content_versions (id) on delete set null;

-- Every takeaway has to say something.
create or replace function app.check_takeaways()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item text;
begin
  foreach v_item in array new.takeaways loop
    if char_length(btrim(v_item)) < 10 or char_length(btrim(v_item)) > 240 then
      raise exception 'each takeaway must be between 10 and 240 characters';
    end if;
  end loop;

  return new;
end;
$$;

create trigger content_versions_check_takeaways
before insert on public.content_versions
for each row execute function app.check_takeaways();

-- Secondary topics.
create table public.content_topics (
  content_id uuid not null references public.content_items (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (content_id, topic_id)
);

-- --------------------------------------------- moderation and reporting --

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  content_id uuid not null references public.content_items (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action public.moderation_action not null,
  reason text check (reason is null or char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);

create trigger moderation_actions_no_update
before update on public.moderation_actions
for each row execute function app.append_only_except_actor('actor_id');

create index moderation_actions_content_idx on public.moderation_actions (content_id, created_at desc);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason public.report_reason not null,
  note text check (note is null or char_length(btrim(note)) between 3 and 500),
  status public.report_status not null default 'open',
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index content_reports_one_open_per_reporter
on public.content_reports (content_id, reporter_id)
where status = 'open';

create index content_reports_open_idx on public.content_reports (created_at) where status = 'open';

-- -------------------------------------------------------- audit log --

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 3 and 60),
  target_type text not null check (char_length(target_type) between 3 and 40),
  target_id text,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Every privileged action. Append-only; a deleted account leaves its entries with a null actor.';

create trigger audit_log_no_update
before update on public.audit_log
for each row execute function app.append_only_except_actor('actor_id');

create index audit_log_recent_idx on public.audit_log (created_at desc);


-- ------------------------------------------------------------ helpers --

-- Writes an audit entry. Used by every privileged function below.
create or replace function app.audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_diff jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, diff)
  values (app.current_user_id(), p_action, p_target_type, p_target_id, p_diff);
$$;

create or replace function app.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('moderator') or public.has_role('admin');
$$;

-- Whether the current viewer may see a card at all. Used by the version and
-- topic policies so they do not each re-implement the rule.
create or replace function app.can_read_content(p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_items c
    where c.id = p_content_id
      and (
        c.status = 'published'
        or c.submitted_by = app.current_user_id()
        or app.is_staff()
      )
  );
$$;

-- --------------------------------------------------- taxonomy functions --

create or replace function public.upsert_category(
  p_slug text,
  p_name text,
  p_description text,
  p_sort_order integer default 0,
  p_is_high_impact boolean default false,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.has_role('admin') then
    raise exception 'upsert_category: administrator access required';
  end if;

  if p_id is null then
    insert into public.categories (slug, name, description, sort_order, is_high_impact)
    values (p_slug, p_name, p_description, p_sort_order, p_is_high_impact)
    returning id into v_id;

    perform app.audit('category.create', 'category', v_id::text,
      jsonb_build_object('slug', p_slug, 'name', p_name));
  else
    update public.categories
    set slug = p_slug,
        name = p_name,
        description = p_description,
        sort_order = p_sort_order,
        is_high_impact = p_is_high_impact
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'upsert_category: no such category';
    end if;

    perform app.audit('category.update', 'category', v_id::text,
      jsonb_build_object('slug', p_slug, 'name', p_name));
  end if;

  return v_id;
end;
$$;

create or replace function public.set_category_archived(p_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'set_category_archived: administrator access required';
  end if;

  update public.categories
  set archived_at = case when p_archived then now() else null end
  where id = p_id;

  perform app.audit(
    case when p_archived then 'category.archive' else 'category.restore' end,
    'category', p_id::text, '{}'::jsonb);
end;
$$;

create or replace function public.upsert_topic(
  p_category_id uuid,
  p_slug text,
  p_name text,
  p_sort_order integer default 0,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.has_role('admin') then
    raise exception 'upsert_topic: administrator access required';
  end if;

  if p_id is null then
    insert into public.topics (category_id, slug, name, sort_order)
    values (p_category_id, p_slug, p_name, p_sort_order)
    returning id into v_id;

    perform app.audit('topic.create', 'topic', v_id::text,
      jsonb_build_object('slug', p_slug, 'name', p_name));
  else
    update public.topics
    set category_id = p_category_id, slug = p_slug, name = p_name, sort_order = p_sort_order
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'upsert_topic: no such topic';
    end if;

    perform app.audit('topic.update', 'topic', v_id::text,
      jsonb_build_object('slug', p_slug, 'name', p_name));
  end if;

  return v_id;
end;
$$;

create or replace function public.set_topic_archived(p_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'set_topic_archived: administrator access required';
  end if;

  update public.topics
  set archived_at = case when p_archived then now() else null end
  where id = p_id;

  perform app.audit(
    case when p_archived then 'topic.archive' else 'topic.restore' end,
    'topic', p_id::text, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------- content functions --

-- Creates a card together with its first version. Used by the catalogue
-- team; a user submission goes through submit_resource instead.
create or replace function public.create_card(
  p_slug text,
  p_primary_topic_id uuid,
  p_source_url text,
  p_source_name text,
  p_title text,
  p_summary text,
  p_takeaways text[],
  p_next_step text,
  p_format public.content_format default 'article',
  p_level public.content_level default 'beginner',
  p_estimated_minutes integer default 5,
  p_quality_score integer default 50,
  p_is_ai_assisted boolean default false,
  p_source_author text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content_id uuid;
  v_version_id uuid;
  v_high_impact boolean;
begin
  if not app.is_staff() then
    raise exception 'create_card: moderator access required';
  end if;

  -- The high-impact flag follows the category, so it cannot be forgotten
  -- or quietly cleared by whoever creates the card.
  select c.is_high_impact into v_high_impact
  from public.topics t
  join public.categories c on c.id = t.category_id
  where t.id = p_primary_topic_id;

  if v_high_impact is null then
    raise exception 'create_card: no such topic';
  end if;

  insert into public.content_items (
    slug, kind, origin, status, primary_topic_id, format, level,
    estimated_minutes, quality_score, source_url, is_ai_assisted,
    is_high_impact, submitted_by
  )
  values (
    p_slug, 'external_resource', 'curated', 'draft', p_primary_topic_id, p_format,
    p_level, p_estimated_minutes, p_quality_score, p_source_url, p_is_ai_assisted,
    v_high_impact, app.current_user_id()
  )
  returning id into v_content_id;

  insert into public.content_versions (
    content_id, version_no, title, summary, takeaways, next_step,
    source_name, source_author, created_by
  )
  values (
    v_content_id, 1, p_title, p_summary, p_takeaways, p_next_step,
    p_source_name, p_source_author, app.current_user_id()
  )
  returning id into v_version_id;

  update public.content_items set current_version_id = v_version_id where id = v_content_id;

  -- Recorded on the card's own trail as well as the audit log, so a card's
  -- history reads start to finish without joining anything.
  insert into public.moderation_actions (content_id, actor_id, action)
  values (v_content_id, app.current_user_id(), 'submit');

  perform app.audit('card.create', 'content_item', v_content_id::text,
    jsonb_build_object('slug', p_slug, 'title', p_title));

  return v_content_id;
end;
$$;

-- A correction is a new version, never an edit of an old one.
create or replace function public.add_card_version(
  p_content_id uuid,
  p_title text,
  p_summary text,
  p_takeaways text[],
  p_next_step text,
  p_source_name text,
  p_source_author text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_next_no integer;
begin
  if not app.is_staff() then
    raise exception 'add_card_version: moderator access required';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_next_no
  from public.content_versions where content_id = p_content_id;

  insert into public.content_versions (
    content_id, version_no, title, summary, takeaways, next_step,
    source_name, source_author, created_by
  )
  values (
    p_content_id, v_next_no, p_title, p_summary, p_takeaways, p_next_step,
    p_source_name, p_source_author, app.current_user_id()
  )
  returning id into v_version_id;

  update public.content_items set current_version_id = v_version_id where id = p_content_id;

  insert into public.moderation_actions (content_id, actor_id, action)
  values (p_content_id, app.current_user_id(), 'edit');

  perform app.audit('card.version', 'content_item', p_content_id::text,
    jsonb_build_object('version_no', v_next_no));

  return v_version_id;
end;
$$;

-- A member of the public proposing a resource. The status and origin are
-- set here, not by the caller, so a submission cannot arrive pre-approved.
create or replace function public.submit_resource(
  p_slug text,
  p_primary_topic_id uuid,
  p_source_url text,
  p_source_name text,
  p_title text,
  p_summary text,
  p_takeaways text[],
  p_next_step text,
  p_format public.content_format default 'article',
  p_level public.content_level default 'beginner',
  p_estimated_minutes integer default 5
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content_id uuid;
  v_version_id uuid;
  v_high_impact boolean;
begin
  if app.current_user_id() is null then
    raise exception 'submit_resource: sign in to submit a resource';
  end if;

  -- A guest may learn and save, but not publish into the catalogue queue.
  if app.is_guest() then
    raise exception 'submit_resource: create an account to submit a resource';
  end if;

  select c.is_high_impact into v_high_impact
  from public.topics t
  join public.categories c on c.id = t.category_id
  where t.id = p_primary_topic_id and t.archived_at is null;

  if v_high_impact is null then
    raise exception 'submit_resource: no such topic';
  end if;

  insert into public.content_items (
    slug, kind, origin, status, primary_topic_id, format, level,
    estimated_minutes, quality_score, source_url, is_high_impact, submitted_by
  )
  values (
    p_slug, 'external_resource', 'user_submitted', 'pending', p_primary_topic_id,
    p_format, p_level, p_estimated_minutes, 50, p_source_url, v_high_impact,
    app.current_user_id()
  )
  returning id into v_content_id;

  insert into public.content_versions (
    content_id, version_no, title, summary, takeaways, next_step,
    source_name, created_by
  )
  values (v_content_id, 1, p_title, p_summary, p_takeaways, p_next_step,
          p_source_name, app.current_user_id())
  returning id into v_version_id;

  update public.content_items set current_version_id = v_version_id where id = v_content_id;

  insert into public.moderation_actions (content_id, actor_id, action)
  values (v_content_id, app.current_user_id(), 'submit');

  return v_content_id;
end;
$$;

-- The one way a card changes status.
create or replace function public.moderate_content(
  p_content_id uuid,
  p_action public.moderation_action,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.content_items;
  v_actor uuid := app.current_user_id();
begin
  if not app.is_staff() then
    raise exception 'moderate_content: moderator access required';
  end if;

  select * into v_item from public.content_items where id = p_content_id;

  if v_item.id is null then
    raise exception 'moderate_content: no such card';
  end if;

  if p_action = 'approve' then
    if v_item.current_version_id is null then
      raise exception 'moderate_content: a card needs a version before it can be published';
    end if;

    -- Finance, health and legal content is never approved by the person who
    -- wrote or submitted it.
    if v_item.is_high_impact and v_item.submitted_by is not distinct from v_actor then
      raise exception
        'moderate_content: high-impact content needs a reviewer who did not submit it';
    end if;

    if v_item.link_checked_at is null then
      raise exception
        'moderate_content: the source link has not been checked (run the link checker first)';
    end if;

    update public.content_items
    set status = 'published',
        reviewed_by = v_actor,
        reviewed_at = now(),
        published_at = coalesce(published_at, now()),
        rejection_reason = null
    where id = p_content_id;

  elsif p_action = 'reject' then
    if p_reason is null then
      raise exception 'moderate_content: a rejection needs a reason';
    end if;

    update public.content_items
    set status = 'rejected', reviewed_by = v_actor, reviewed_at = now(),
        rejection_reason = p_reason
    where id = p_content_id;

  elsif p_action = 'archive' then
    if p_reason is null then
      raise exception 'moderate_content: archiving needs a reason';
    end if;

    update public.content_items
    set status = 'archived', reviewed_by = v_actor, reviewed_at = now()
    where id = p_content_id;

  elsif p_action = 'restore' then
    update public.content_items
    set status = 'pending', rejection_reason = null, published_at = null
    where id = p_content_id;

  else
    raise exception 'moderate_content: % is not a status change', p_action;
  end if;

  insert into public.moderation_actions (content_id, actor_id, action, reason)
  values (p_content_id, v_actor, p_action, p_reason);

  perform app.audit('card.' || p_action::text, 'content_item', p_content_id::text,
    jsonb_build_object('reason', p_reason));
end;
$$;

-- Records that a real request reached the source. Only a privileged caller
-- (the link-checking job) may set it, so the publication rule cannot be
-- satisfied by hand.
create or replace function public.record_link_check(p_content_id uuid, p_reachable boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.content_items
  set link_checked_at = case when p_reachable then now() else null end
  where id = p_content_id;

  perform app.audit('card.link_check', 'content_item', p_content_id::text,
    jsonb_build_object('reachable', p_reachable));
end;
$$;

create or replace function public.report_content(
  p_content_id uuid,
  p_reason public.report_reason,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
begin
  if app.current_user_id() is null or app.is_guest() then
    raise exception 'report_content: create an account to report a resource';
  end if;

  insert into public.content_reports (content_id, reporter_id, reason, note)
  values (p_content_id, app.current_user_id(), p_reason, p_note)
  returning id into v_report_id;

  return v_report_id;
end;
$$;

create or replace function public.resolve_report(
  p_report_id uuid,
  p_outcome public.report_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content_id uuid;
begin
  if not app.is_staff() then
    raise exception 'resolve_report: moderator access required';
  end if;

  if p_outcome not in ('actioned', 'dismissed') then
    raise exception 'resolve_report: outcome must be actioned or dismissed';
  end if;

  update public.content_reports
  set status = p_outcome, resolved_by = app.current_user_id(), resolved_at = now()
  where id = p_report_id
  returning content_id into v_content_id;

  if v_content_id is null then
    raise exception 'resolve_report: no such report';
  end if;

  insert into public.moderation_actions (content_id, actor_id, action, reason)
  values (v_content_id, app.current_user_id(), 'resolve_report', p_note);

  perform app.audit('report.' || p_outcome::text, 'content_report', p_report_id::text,
    jsonb_build_object('note', p_note));
end;
$$;

-- --------------------------------------------------------- row security --

alter table public.categories enable row level security;
alter table public.topics enable row level security;
alter table public.content_items enable row level security;
alter table public.content_versions enable row level security;
alter table public.content_topics enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.content_reports enable row level security;
alter table public.audit_log enable row level security;

-- Taxonomy is public, apart from archived entries, which only staff see.
create policy categories_select_live
on public.categories for select
to anon, authenticated
using (archived_at is null);

create policy categories_select_staff
on public.categories for select
to authenticated
using (app.is_staff());

create policy topics_select_live
on public.topics for select
to anon, authenticated
using (archived_at is null);

create policy topics_select_staff
on public.topics for select
to authenticated
using (app.is_staff());

-- No write policies on the taxonomy: the admin functions are the only route.

-- A card is public once published. Its author can see their own submission
-- at any status, and staff can see everything.
create policy content_items_select_published
on public.content_items for select
to anon, authenticated
using (status = 'published');

create policy content_items_select_own
on public.content_items for select
to authenticated
using (submitted_by = app.current_user_id());

create policy content_items_select_staff
on public.content_items for select
to authenticated
using (app.is_staff());

-- No insert, update or delete policy. Every change goes through a function
-- that checks the caller's role and writes an audit entry.

create policy content_versions_select
on public.content_versions for select
to anon, authenticated
using (app.can_read_content(content_id));

create policy content_topics_select
on public.content_topics for select
to anon, authenticated
using (app.can_read_content(content_id));

create policy moderation_actions_select_staff
on public.moderation_actions for select
to authenticated
using (app.is_staff());

-- A reporter sees their own reports; staff see all of them.
create policy content_reports_select_own
on public.content_reports for select
to authenticated
using (reporter_id = app.current_user_id());

create policy content_reports_select_staff
on public.content_reports for select
to authenticated
using (app.is_staff());

create policy audit_log_select_admin
on public.audit_log for select
to authenticated
using (public.has_role('admin'));

-- ---------------------------------------------------------------- grants --

grant select on public.categories, public.topics to anon, authenticated;
grant select on public.content_items, public.content_versions, public.content_topics
to anon, authenticated;
grant select on public.moderation_actions, public.content_reports to authenticated;
grant select on public.audit_log to authenticated;

grant execute on function public.upsert_category(text, text, text, integer, boolean, uuid) to authenticated;
grant execute on function public.set_category_archived(uuid, boolean) to authenticated;
grant execute on function public.upsert_topic(uuid, text, text, integer, uuid) to authenticated;
grant execute on function public.set_topic_archived(uuid, boolean) to authenticated;
grant execute on function public.create_card(
  text, uuid, text, text, text, text, text[], text,
  public.content_format, public.content_level, integer, integer, boolean, text
) to authenticated;
grant execute on function public.add_card_version(uuid, text, text, text[], text, text, text)
to authenticated;
grant execute on function public.submit_resource(
  text, uuid, text, text, text, text, text[], text,
  public.content_format, public.content_level, integer
) to authenticated;
grant execute on function public.moderate_content(uuid, public.moderation_action, text)
to authenticated;
grant execute on function public.report_content(uuid, public.report_reason, text) to authenticated;
grant execute on function public.resolve_report(uuid, public.report_status, text) to authenticated;

-- The link checker runs with a privileged client, never as a viewer, so a
-- moderator cannot satisfy the publication rule by asserting the link works.
revoke all on function public.record_link_check(uuid, boolean) from public, anon, authenticated;
grant execute on function public.record_link_check(uuid, boolean) to service_role;

-- ------------------------------------------------------------ full text --

alter table public.content_versions
add column search_text tsvector
generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B')
) stored;

create index content_versions_search_idx on public.content_versions using gin (search_text);
