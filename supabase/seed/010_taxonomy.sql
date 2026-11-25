-- The approved launch taxonomy.
--
-- Generated from src/modules/content/taxonomy.ts, which is the reviewed
-- source. Re-running this is safe: it updates names and descriptions and
-- adds anything missing, and never deletes.
--
-- Applied with a privileged client. The everyday route is upsert_category
-- and upsert_topic, which check the caller's role and write an audit entry.

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('technology-and-ai', 'Technology and AI', 'How the tools shaping your work actually function, and how to use them well.', 0, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'technology-and-ai'), 'ai-foundations', 'AI foundations', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'technology-and-ai'), 'working-with-ai-tools', 'Working with AI tools', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'technology-and-ai'), 'software-and-building', 'Software and building', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'technology-and-ai'), 'data-and-privacy', 'Data and privacy', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'technology-and-ai'), 'security-basics', 'Security basics', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('career-development', 'Career Development', 'Finding, choosing and growing in work that suits you.', 1, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'career-development'), 'job-search', 'Job search', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'career-development'), 'interviews', 'Interviews', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'career-development'), 'negotiation', 'Negotiation', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'career-development'), 'management-and-leadership', 'Management and leadership', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'career-development'), 'career-changes', 'Career changes', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('entrepreneurship', 'Entrepreneurship', 'Starting something small and finding out whether it works.', 2, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'entrepreneurship'), 'finding-an-idea', 'Finding an idea', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'entrepreneurship'), 'talking-to-customers', 'Talking to customers', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'entrepreneurship'), 'pricing-and-revenue', 'Pricing and revenue', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'entrepreneurship'), 'marketing-basics', 'Marketing basics', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'entrepreneurship'), 'running-a-small-business', 'Running a small business', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('personal-finance', 'Personal Finance', 'Understanding money well enough to make your own decisions.', 3, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'personal-finance'), 'budgeting', 'Budgeting', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'personal-finance'), 'debt-and-credit', 'Debt and credit', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'personal-finance'), 'saving-and-investing-basics', 'Saving and investing basics', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'personal-finance'), 'tax-and-pensions-uk', 'Tax and pensions (UK)', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'personal-finance'), 'avoiding-scams', 'Avoiding scams', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('productivity', 'Productivity', 'Getting the things that matter done, without theatre.', 4, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'productivity'), 'attention-and-focus', 'Attention and focus', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'productivity'), 'planning-and-prioritising', 'Planning and prioritising', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'productivity'), 'habits', 'Habits', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'productivity'), 'note-taking', 'Note taking', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'productivity'), 'meetings-and-email', 'Meetings and email', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('communication', 'Communication', 'Being understood, in writing and in the room.', 5, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'communication'), 'clear-writing', 'Clear writing', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'communication'), 'speaking-and-presenting', 'Speaking and presenting', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'communication'), 'difficult-conversations', 'Difficult conversations', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'communication'), 'listening', 'Listening', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'communication'), 'persuasion-and-influence', 'Persuasion and influence', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('health-and-wellbeing', 'Health and Wellbeing', 'Practical, evidence-led basics for sleep, movement and mind.', 6, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'health-and-wellbeing'), 'sleep', 'Sleep', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'health-and-wellbeing'), 'movement-and-strength', 'Movement and strength', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'health-and-wellbeing'), 'nutrition-basics', 'Nutrition basics', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'health-and-wellbeing'), 'stress-and-mood', 'Stress and mood', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'health-and-wellbeing'), 'screens-and-attention', 'Screens and attention', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.categories (slug, name, description, sort_order, is_high_impact)
values ('learning-how-to-learn', 'Learning How to Learn', 'Methods that make everything else on VSHARES stick.', 7, false)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_high_impact = excluded.is_high_impact;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'learning-how-to-learn'), 'memory-and-recall', 'Memory and recall', 0)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'learning-how-to-learn'), 'spaced-repetition', 'Spaced repetition', 1)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'learning-how-to-learn'), 'deliberate-practice', 'Deliberate practice', 2)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'learning-how-to-learn'), 'reading-and-comprehension', 'Reading and comprehension', 3)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.topics (category_id, slug, name, sort_order)
values ((select id from public.categories where slug = 'learning-how-to-learn'), 'study-planning', 'Study planning', 4)
on conflict (slug) do update
set name = excluded.name, sort_order = excluded.sort_order;
