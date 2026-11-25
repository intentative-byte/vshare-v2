-- Creating, versioning and publishing a card.
do $$
declare
  v_mod uuid;
  v_plain uuid;
  v_category uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('card-mod@example.com');
  v_plain := test.create_user('card-plain@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  v_category := gen_random_uuid();
  insert into public.categories (id, slug, name, description)
  values (v_category, 'productivity', 'Productivity', 'Getting the things that matter done.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, v_category, 'habits', 'Habits');

  -- Only staff create cards.
  perform test.become(v_plain);
  perform test.refuses(
    format($q$select public.create_card('a-card-slug', %L, 'https://example.com/a',
      'Example', 'A clear and useful title here',
      'A summary that is comfortably long enough to pass the minimum length check applied by the database.',
      array['A takeaway that says something useful.'], 'Try the thing described above.')$q$, v_topic),
    'a plain account cannot create a card');

  perform test.become(v_mod);
  v_card := public.create_card('focus-blocks-explained', v_topic, 'https://example.com/focus',
    'Example Publisher', 'How focus blocks actually work',
    'A short explanation of why uninterrupted blocks of work beat scattered attention, and how long a block should be.',
    array['Context switching has a measurable cost.', 'Blocks of 45 to 90 minutes suit most work.'],
    'Put one 60-minute block in tomorrow''s calendar.');

  perform test.ok(v_card is not null, 'a moderator can create a card');
  perform test.equals(
    (select status from public.content_items where id = v_card), 'draft'::public.content_status,
    'a new card starts as a draft');
  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 1,
    'the card has its first version');
  perform test.ok(
    (select current_version_id from public.content_items where id = v_card) is not null,
    'the card points at its current version');
end;
$$;

-- Publication requires a review and a checked link.
do $$
declare
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('pub-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('11111111-1111-4111-8111-111111111111', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '11111111-1111-4111-8111-111111111111', 'planning', 'Planning');

  perform test.become(v_mod);
  v_card := public.create_card('weekly-review-method', v_topic, 'https://example.com/review',
    'Example Publisher', 'A weekly review that takes thirty minutes',
    'A repeatable way to turn the week just gone into decisions for the week ahead, with a short checklist.',
    array['Reviewing without deciding changes nothing.'], 'Book thirty minutes on Friday afternoon.');

  -- The link has not been checked, so it cannot go live.
  perform test.refuses(
    format('select public.moderate_content(%L, ''approve'')', v_card),
    'a card cannot be published before its link has been checked');

  -- Only a privileged caller records a link check.
  perform test.refuses(
    format('select public.record_link_check(%L, true)', v_card),
    'a moderator cannot record a link check by hand');

  perform test.become_service();
  perform public.record_link_check(v_card, true);

  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.equals(
    (select status from public.content_items where id = v_card), 'published'::public.content_status,
    'the card is published once reviewed and checked');
  perform test.ok(
    (select reviewed_by from public.content_items where id = v_card) = v_mod,
    'the reviewer is recorded');
  perform test.ok(
    (select published_at from public.content_items where id = v_card) is not null,
    'the publication time is recorded');
  perform test.equals(
    (select count(*)::int from public.moderation_actions
      where content_id = v_card and action = 'approve'), 1,
    'the approval is in the moderation record');
end;
$$;

-- Rejection and archiving need a reason; versions are immutable.
do $$
declare
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('rej-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('22222222-2222-4222-8222-222222222222', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '22222222-2222-4222-8222-222222222222', 'note-taking', 'Note taking');

  perform test.become(v_mod);
  v_card := public.create_card('note-taking-basics', v_topic, 'https://example.com/notes',
    'Example Publisher', 'Notes you will actually read again',
    'Why most notes are never reopened, and the small changes that make them worth keeping over time.',
    array['A note without a question is hard to reuse.'], 'Rewrite one old note as a question.');

  perform test.refuses(
    format('select public.moderate_content(%L, ''reject'')', v_card),
    'a rejection without a reason is refused');

  perform public.moderate_content(v_card, 'reject', 'The source is a marketing page.');
  perform test.equals(
    (select rejection_reason from public.content_items where id = v_card),
    'The source is a marketing page.',
    'the reason is recorded and shown to the submitter');

  perform test.refuses(
    format('update public.content_versions set title = ''Rewritten'' where content_id = %L', v_card),
    'a published version cannot be edited in place');

  -- A correction is a new version.
  perform public.moderate_content(v_card, 'restore');
  perform public.add_card_version(v_card, 'Notes you will actually reread',
    'A revised explanation of why most notes are never reopened, and what to change about how you write them.',
    array['A note written as a question is easier to reuse.'], 'Rewrite one old note as a question.',
    'Example Publisher');

  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 2,
    'the correction is a second version, and the first still exists');
  perform test.equals(
    (select v.version_no from public.content_versions v
      join public.content_items c on c.current_version_id = v.id where c.id = v_card), 2,
    'the card now points at the newer version');
end;
$$;

-- A published card survives the deletion of the account that reviewed it,
-- and loses the reference to that person.
do $$
declare
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('leaving-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('55555555-5555-4555-8555-555555555555', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '55555555-5555-4555-8555-555555555555', 'habits', 'Habits');

  perform test.become(v_mod);
  v_card := public.create_card('habit-stacking-basics', v_topic, 'https://example.com/habits',
    'Example Publisher', 'Attaching a new habit to an old one',
    'Why a new habit sticks better when it follows something you already do without thinking about it.',
    array['A cue you already have is easier than a new one.'], 'Pick one existing habit to attach to.');

  perform test.become_service();
  perform public.record_link_check(v_card, true);

  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become_owner();
  delete from auth.users where id = v_mod;

  perform test.equals(
    (select status from public.content_items where id = v_card), 'published'::public.content_status,
    'the card stays published after the reviewer leaves');
  perform test.equals(
    (select reviewed_by from public.content_items where id = v_card), null::uuid,
    'the reviewer reference is cleared');
  perform test.ok(
    (select reviewed_at from public.content_items where id = v_card) is not null,
    'the fact that it was reviewed is kept');
  perform test.equals(
    (select count(*)::int from public.moderation_actions where content_id = v_card and actor_id is null), 2,
    'the moderation record survives with the actor anonymised');
end;
$$;

-- A version cannot be edited, but removing its card removes it: an
-- append-only table must not block someone deleting their own account.
do $$
declare
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('version-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('66666666-6666-4666-8666-666666666667', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, '66666666-6666-4666-8666-666666666667', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('version-cascade-card', v_topic, 'https://example.com/vc',
    'Example Publisher', 'A card whose version should cascade',
    'A summary that is long enough to satisfy the minimum length rule applied to every version.',
    array['Something worth taking away.'], 'Try it for one week.');

  perform test.refuses(
    format('update public.content_versions set title = ''Changed'' where content_id = %L', v_card),
    'a version still cannot be edited');

  perform test.become_owner();
  delete from public.content_items where id = v_card;

  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 0,
    'removing the card removes its versions');
end;
$$;
