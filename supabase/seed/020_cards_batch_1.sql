-- Value cards, batch 1: ten cards for editorial review.
--
-- Every card is loaded as a DRAFT with link_checked_at left null, so none of
-- them can be published: the database refuses to publish a card whose source
-- link has not been checked by the link checker, and refuses high-impact
-- content approved by the person who wrote it up.
--
-- The review copy of this batch, with the reasoning behind each card, is in
-- docs/VSHARES_CATALOGUE_BATCH_1.md.
--
-- Applied with a privileged client, as seed data. The everyday route for
-- creating a card is public.create_card, which checks the caller's role and
-- writes an audit entry.

create or replace function pg_temp.seed_card(
  p_slug text,
  p_topic_slug text,
  p_source_url text,
  p_source_name text,
  p_source_author text,
  p_title text,
  p_summary text,
  p_takeaways text[],
  p_next_step text,
  p_format public.content_format,
  p_level public.content_level,
  p_minutes integer,
  p_quality integer
)
returns void
language plpgsql
as $$
declare
  v_topic uuid;
  v_high_impact boolean;
  v_content uuid;
  v_version uuid;
begin
  select t.id, c.is_high_impact into v_topic, v_high_impact
  from public.topics t
  join public.categories c on c.id = t.category_id
  where t.slug = p_topic_slug;

  if v_topic is null then
    raise exception 'seed_card: no such topic %', p_topic_slug;
  end if;

  insert into public.content_items (
    slug, kind, origin, status, primary_topic_id, format, level,
    estimated_minutes, quality_score, source_url, is_ai_assisted, is_high_impact
  )
  values (
    p_slug, 'external_resource', 'curated', 'draft', v_topic, p_format, p_level,
    p_minutes, p_quality, p_source_url, false, v_high_impact
  )
  on conflict (slug) do nothing
  returning id into v_content;

  if v_content is null then
    return;
  end if;

  insert into public.content_versions (
    content_id, version_no, title, summary, takeaways, next_step,
    source_name, source_author
  )
  values (v_content, 1, p_title, p_summary, p_takeaways, p_next_step,
          p_source_name, p_source_author)
  returning id into v_version;

  update public.content_items set current_version_id = v_version where id = v_content;
end;
$$;

-- 1. Technology and AI
select pg_temp.seed_card(
  'machine-learning-crash-course',
  'ai-foundations',
  'https://developers.google.com/machine-learning/crash-course',
  'Google', null,
  'A structured first course in machine learning',
  'A free, self-paced course that introduces how machine learning models are trained and evaluated, with short videos and exercises rather than mathematics for its own sake. It is aimed at people who write software or work alongside those who do.',
  array[
    'Training a model means adjusting it until its predictions match known answers closely enough.',
    'Most of the work in practice is preparing data, not choosing an algorithm.'
  ],
  'Work through the first module and write down one term you had not met before.',
  'course', 'beginner', 25, 85
);

-- 2. Technology and AI
select pg_temp.seed_card(
  'staying-secure-online-basics',
  'security-basics',
  'https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online',
  'National Cyber Security Centre', null,
  'The handful of security steps that matter most',
  'The UK National Cyber Security Centre''s short guidance on protecting everyday accounts. It is deliberately a small number of steps, chosen because they prevent the majority of ordinary attacks, rather than an exhaustive list nobody follows.',
  array[
    'Protecting the email account that can reset every other password matters most.',
    'A password manager removes the need to remember or reuse passwords.',
    'Two-factor authentication blocks most attacks that start with a stolen password.'
  ],
  'Turn on two-factor authentication for your main email account today.',
  'article', 'beginner', 10, 90
);

-- 3. Technology and AI
select pg_temp.seed_card(
  'asking-for-your-own-data',
  'data-and-privacy',
  'https://ico.org.uk/for-the-public/your-right-to-get-copies-of-your-data/',
  'Information Commissioner''s Office', null,
  'How to ask an organisation what it knows about you',
  'The UK data protection regulator''s explanation of the right of access: what you can ask for, how to ask, and what an organisation has to do in response. Useful whether you are exercising the right yourself or building a product that has to honour it.',
  array[
    'You can ask any organisation for a copy of the personal data it holds about you.',
    'A request does not have to use any particular wording or form.'
  ],
  'Pick one service you use and find its route for making a data request.',
  'article', 'beginner', 8, 85
);

-- 4. Personal Finance (high impact)
select pg_temp.seed_card(
  'building-a-first-monthly-budget',
  'budgeting',
  'https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner',
  'MoneyHelper', null,
  'A budget planner that does the arithmetic for you',
  'A free budgeting tool from the UK government-backed money guidance service. It walks through income, fixed costs and spending, then shows what is left and where it goes. It is general information rather than advice about your own circumstances.',
  array[
    'Writing fixed costs down is what makes them negotiable.',
    'A budget is a plan for money you have, not a prediction of money you might get.'
  ],
  'List every fixed monthly cost you have before the end of this week.',
  'tool', 'beginner', 20, 85
);

-- 5. Personal Finance (high impact)
select pg_temp.seed_card(
  'spotting-financial-scams',
  'avoiding-scams',
  'https://www.takefive-stopfraud.org.uk/',
  'Take Five to Stop Fraud', null,
  'The pause that stops most financial scams',
  'A UK campaign backed by banks and the government built around one idea: stop, challenge, protect. Most scams depend on urgency, so the advice is about creating a moment to think rather than memorising every variety of fraud.',
  array[
    'Urgency is the common thread in almost every scam.',
    'No legitimate organisation asks you to move money to a "safe account".'
  ],
  'Agree a rule with one family member: no money moves without a phone call first.',
  'article', 'beginner', 8, 85
);

-- 6. Health and Wellbeing (high impact)
select pg_temp.seed_card(
  'getting-to-sleep-nhs-guidance',
  'sleep',
  'https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/',
  'NHS', null,
  'What actually helps when you cannot sleep',
  'NHS guidance on sleep: regular timing, winding down, and when poor sleep is worth seeing a doctor about. It is short, free of supplements and gadgets, and clear about the point at which self-help is not the answer. General information, not medical advice.',
  array[
    'A consistent wake time does more for sleep than a consistent bedtime.',
    'Persistent sleep problems are worth raising with a doctor rather than managing alone.'
  ],
  'Set one alarm for the same wake time every day this week, including the weekend.',
  'article', 'beginner', 7, 90
);

-- 7. Communication
select pg_temp.seed_card(
  'writing-people-understand',
  'clear-writing',
  'https://www.gov.uk/guidance/content-design/writing-for-gov-uk',
  'Government Digital Service', null,
  'Writing that people understand the first time',
  'The style guidance behind GOV.UK, written for people producing information the public has to act on. It covers plain words, short sentences and structure, and is unusually direct about the cost of jargon.',
  array[
    'Write for the person with the least time and the most to lose.',
    'Shorter sentences are not simpler ideas, only clearer ones.'
  ],
  'Rewrite one paragraph you sent this week, cutting it by a third.',
  'article', 'beginner', 12, 85
);

-- 8. Career Development
select pg_temp.seed_card(
  'preparing-for-an-interview',
  'interviews',
  'https://nationalcareers.service.gov.uk/careers-advice/interview-advice',
  'National Careers Service', null,
  'Preparing for an interview without guessing',
  'Free UK careers service guidance on preparing for interviews: what to research, how to structure answers about your experience, and what to ask at the end. It is practical and free of the confidence-as-a-substitute-for-preparation advice common elsewhere.',
  array[
    'A structured answer about a real situation beats a general claim about yourself.',
    'The questions you ask are part of what is being assessed.'
  ],
  'Write out one example of your work using situation, task, action and result.',
  'article', 'beginner', 12, 80
);

-- 9. Learning How to Learn
select pg_temp.seed_card(
  'spaced-repetition-for-memory',
  'spaced-repetition',
  'https://augmentingcognition.com/ltm.html',
  'Michael Nielsen', 'Michael Nielsen',
  'Why reviewing at increasing intervals works',
  'A long essay on using spaced repetition seriously: how review schedules affect what is retained, what makes a good prompt, and where the method stops helping. It is considerably more thoughtful than the usual flashcard advice, and honest about the effort involved.',
  array[
    'Reviewing just before you would have forgotten is what strengthens memory.',
    'A prompt that can be answered without understanding teaches you nothing.'
  ],
  'Write five prompts for something you learned this month and review them tomorrow.',
  'article', 'intermediate', 35, 85
);

-- 10. Entrepreneurship
select pg_temp.seed_card(
  'setting-up-a-business-uk',
  'running-a-small-business',
  'https://www.gov.uk/set-up-business',
  'GOV.UK', null,
  'The actual steps to set up a business in the UK',
  'The official starting point for setting up in the UK: choosing a structure, registering, and the records you have to keep. It answers the administrative questions that are easy to get wrong and expensive to fix later.',
  array[
    'The legal structure you choose changes your tax and your personal liability.',
    'Registration deadlines start from when you begin trading, not when you incorporate.'
  ],
  'Decide whether you would be a sole trader or a limited company, and write down why.',
  'article', 'beginner', 15, 80
);
