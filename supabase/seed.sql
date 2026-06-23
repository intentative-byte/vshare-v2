insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'lina@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Lina Chen","user_name":"lina"}',
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marcus@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Marcus Okafor","user_name":"marcus"}',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, username, full_name, headline, interests)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'lina',
    'Lina Chen',
    'Product strategist exploring AI-native workflows',
    array['AI', 'Product', 'Startups']
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'marcus',
    'Marcus Okafor',
    'Engineering lead focused on learning systems',
    array['Engineering', 'Leadership', 'Data']
  )
on conflict (id) do update
set
  username = excluded.username,
  full_name = excluded.full_name,
  headline = excluded.headline,
  interests = excluded.interests;

insert into public.posts (author_id, title, summary, url, content_type, topics, difficulty, estimated_minutes)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'A practical map for choosing AI product ideas',
    'A framework for matching user pain, proprietary context, and automation leverage before committing to an AI feature.',
    'https://example.com/ai-product-map',
    'article',
    array['AI', 'Product', 'Startups'],
    'intermediate',
    12
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Designing feeds that teach instead of distract',
    'How progressive disclosure, spaced repetition, and feedback loops can make content feeds feel productive.',
    'https://example.com/learning-feeds',
    'video',
    array['Design', 'Engineering', 'Data'],
    'advanced',
    21
  )
on conflict do nothing;
