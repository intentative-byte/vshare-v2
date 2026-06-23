create extension if not exists pgcrypto;

create type public.content_type as enum ('article', 'video', 'course', 'podcast', 'thread');
create type public.difficulty_level as enum ('beginner', 'intermediate', 'advanced');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) >= 3),
  full_name text,
  headline text,
  avatar_url text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  topics text[] not null default '{}',
  goals text[] not null default '{}',
  daily_minutes integer not null default 20 check (daily_minutes between 5 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) >= 3),
  summary text not null check (char_length(summary) >= 10),
  url text,
  content_type public.content_type not null default 'article',
  topics text[] not null default '{}',
  difficulty public.difficulty_level not null default 'beginner',
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  created_at timestamptz not null default now()
);

create table public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index posts_created_at_idx on public.posts(created_at desc);
create index posts_topics_idx on public.posts using gin(topics);
create index preferences_topics_idx on public.preferences using gin(topics);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger preferences_set_updated_at
before update on public.preferences
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'user_name', ''), 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.posts enable row level security;
alter table public.saved_posts enable row level security;

create policy "Profiles are public"
on public.profiles for select
using (true);

create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users manage own preferences"
on public.preferences for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Posts are public"
on public.posts for select
using (true);

create policy "Authenticated users create posts"
on public.posts for insert
with check (auth.uid() = author_id);

create policy "Authors update own posts"
on public.posts for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Users manage saved posts"
on public.saved_posts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
