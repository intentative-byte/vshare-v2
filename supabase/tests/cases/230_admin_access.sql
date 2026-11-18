-- The admin interface surfaces taxonomy controls to any staff member, but
-- taxonomy belongs to administrators. The database is where that boundary is
-- actually enforced, so this proves it holds whatever the interface shows.

-- A moderator can manage cards but not taxonomy.
do $$
declare
  v_admin uuid;
  v_mod uuid;
  v_category uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_admin := test.create_user('adm-access-admin@example.com');
  v_mod := test.create_user('adm-access-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');

  -- The admin lays down a category and a topic.
  perform test.become(v_admin);
  v_category := public.upsert_category('careers', 'Career',
    'Work that goes somewhere worth going.', 3, false);
  v_topic := public.upsert_topic(v_category, 'interview-skills', 'Interview skills');

  -- A moderator cannot touch taxonomy, through any of the functions the
  -- admin interface calls.
  perform test.become(v_mod);
  perform test.refuses(
    'select public.upsert_category(''mod-made'', ''Mod made'', ''A moderator should not be able to make this.'')',
    'a moderator cannot create a category');
  perform test.refuses(
    format('select public.upsert_category(''careers'', ''Renamed'', ''A moderator should not rename this.'', 0, false, %L)', v_category),
    'a moderator cannot edit a category');
  perform test.refuses(
    format('select public.upsert_topic(%L, ''mod-topic'', ''Mod topic'')', v_category),
    'a moderator cannot create a topic');
  perform test.refuses(
    format('select public.set_category_archived(%L, true)', v_category),
    'a moderator cannot archive a category');
  perform test.refuses(
    format('select public.set_topic_archived(%L, true)', v_topic),
    'a moderator cannot archive a topic');

  -- But a moderator can create and manage cards.
  v_card := public.create_card('a-moderator-card', v_topic, 'https://example.com/mod',
    'Example Publisher', 'A card a moderator created',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['Something worth taking away from it.'], 'Do the thing it suggests.',
    'article', 'beginner', 8, 70);
  perform test.ok(v_card is not null, 'a moderator can create a card');
  perform test.equals(
    (select status::text from public.content_items where id = v_card), 'draft',
    'and it enters as a draft, never pre-published');
end;
$$;

-- A learner can do none of it, through any route.
do $$
declare
  v_admin uuid;
  v_learner uuid;
  v_category uuid;
  v_topic uuid;
begin
  perform test.reset();
  v_admin := test.create_user('adm-learner-admin@example.com');
  v_learner := test.create_user('adm-learner@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');

  perform test.become(v_admin);
  v_category := public.upsert_category('health', 'Health',
    'Looking after the body you think with.', 1, true);
  v_topic := public.upsert_topic(v_category, 'sleep-basics', 'Sleep basics');

  perform test.become(v_learner);
  perform test.refuses(
    'select public.upsert_category(''l'', ''L'', ''A learner should not make this.'')',
    'a learner cannot create a category');
  perform test.refuses(
    format('select public.create_card(''learner-card'', %L, ''https://example.com/l'', ''Pub'', ''A learner card title here'', ''A summary long enough to satisfy the minimum length rule applied to every version here.'', array[''A takeaway long enough to pass the rule.''], ''Do the next step now.'')', v_topic),
    'a learner cannot create a card');
  -- A blocked read under row-level security returns nothing; it does not
  -- raise. So the check is that the learner sees an empty audit log, even
  -- though the admin above wrote several entries to it.
  perform test.equals(
    (select count(*)::int from public.audit_log), 0,
    'a learner reads no audit log rows at all');
end;
$$;

-- A card's version history is kept whole, and the admin card read returns it.
do $$
declare
  v_admin uuid;
  v_mod uuid;
  v_category uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_admin := test.create_user('hist-admin@example.com');
  v_mod := test.create_user('hist-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin');
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');

  perform test.become(v_admin);
  v_category := public.upsert_category('learning', 'Learning',
    'Getting better at getting better.', 2, false);
  v_topic := public.upsert_topic(v_category, 'memory', 'Memory');

  perform test.become(v_mod);
  v_card := public.create_card('a-card-with-history', v_topic, 'https://example.com/hist',
    'Example Publisher', 'The first title',
    'A summary long enough to satisfy the minimum length rule that the database applies to every version.',
    array['The first takeaway, long enough to pass.'], 'Do the first next step.',
    'article', 'beginner', 8, 70);

  -- A correction is a new version, not an edit of the old one.
  perform public.add_card_version(v_card, 'The second title',
    'A corrected summary, still long enough to satisfy the minimum length rule for a version.',
    array['The second takeaway, long enough to pass.'], 'Do the second next step.',
    'Example Publisher');

  perform test.equals(
    (select count(*)::int from public.content_versions where content_id = v_card), 2,
    'both versions are kept');
  perform test.equals(
    (select title from public.content_versions v
       join public.content_items c on c.current_version_id = v.id where c.id = v_card),
    'The second title',
    'the card points at the newest version');
  perform test.equals(
    (select version_no from public.content_versions v
       join public.content_items c on c.current_version_id = v.id where c.id = v_card), 2,
    'which is version two');
  -- The original is still there, unchanged.
  perform test.equals(
    (select title from public.content_versions where content_id = v_card and version_no = 1),
    'The first title',
    'and the original version is unchanged, not overwritten');
end;
$$;
