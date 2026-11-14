-- Reporting a resource.
do $$
declare
  v_member uuid;
  v_guest uuid;
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
  v_report uuid;
begin
  perform test.reset();
  v_member := test.create_user('reporter@example.com');
  v_guest := test.create_user(null, true);
  v_mod := test.create_user('report-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('focus-myths-examined', v_topic, 'https://example.com/myths',
    'Example Publisher', 'Three claims about focus that do not hold up',
    'A look at widely repeated claims about concentration and what the underlying studies actually measured.',
    array['A popular claim is not the same as a measured one.'], 'Check the source of the next statistic you repeat.');

  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  -- A guest cannot report.
  perform test.become(v_guest);
  perform test.refuses(
    format('select public.report_content(%L, ''broken_link'')', v_card),
    'a guest cannot report a resource');

  -- A registered account can, once.
  perform test.become(v_member);
  v_report := public.report_content(v_card, 'broken_link', 'The page returns a 404.');
  perform test.ok(v_report is not null, 'a registered account can report a resource');

  perform test.refuses(
    format('select public.report_content(%L, ''inaccurate'')', v_card),
    'the same account cannot open a second report on the same card');

  perform test.equals(
    (select count(*)::int from public.content_reports where id = v_report), 1,
    'the reporter can see their own report');

  -- Only staff resolve reports.
  perform test.refuses(
    format('select public.resolve_report(%L, ''dismissed'')', v_report),
    'a reporter cannot resolve their own report');

  perform test.become(v_mod);
  perform public.resolve_report(v_report, 'actioned', 'Link confirmed broken; card archived.');

  perform test.equals(
    (select status from public.content_reports where id = v_report), 'actioned'::public.report_status,
    'a moderator can resolve a report');
  perform test.equals(
    (select count(*)::int from public.moderation_actions
      where content_id = v_card and action = 'resolve_report'), 1,
    'resolving a report is on the card''s trail');
end;
$$;

-- A report is private to its reporter and to staff.
do $$
declare
  v_reporter uuid;
  v_other uuid;
  v_mod uuid;
  v_topic uuid;
  v_card uuid;
begin
  perform test.reset();
  v_reporter := test.create_user('priv-reporter@example.com');
  v_other := test.create_user('priv-other@example.com');
  v_mod := test.create_user('priv-mod@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  insert into public.categories (id, slug, name, description)
  values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'productivity', 'Productivity', 'Doing what matters.');
  v_topic := gen_random_uuid();
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'focus', 'Focus');

  perform test.become(v_mod);
  v_card := public.create_card('deep-work-summary', v_topic, 'https://example.com/deep',
    'Example Publisher', 'What uninterrupted work actually requires',
    'The conditions that make long stretches of concentration possible, and the ones that quietly prevent them.',
    array['Interruption costs more than the minutes it takes.'], 'Silence one notification source today.');
  perform test.become_service();
  perform public.record_link_check(v_card, true);
  perform test.become(v_mod);
  perform public.moderate_content(v_card, 'approve');

  perform test.become(v_reporter);
  perform public.report_content(v_card, 'inaccurate', 'The second claim is misattributed.');

  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.content_reports), 0,
    'another account cannot see someone else''s report');

  perform test.become(v_mod);
  perform test.equals(
    (select count(*)::int from public.content_reports), 1,
    'a moderator can see it');
end;
$$;

-- The audit log records privileged actions, is append-only, and is read by
-- administrators only.
do $$
declare
  v_admin uuid;
  v_mod uuid;
  v_member uuid;
  v_category uuid;
begin
  perform test.reset();
  v_admin := test.create_user('audit-admin@example.com');
  v_mod := test.create_user('audit-mod@example.com');
  v_member := test.create_user('audit-member@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_admin, 'admin'), (v_mod, 'moderator');

  perform test.become(v_admin);
  v_category := public.upsert_category('health-and-wellbeing', 'Health and Wellbeing',
    'Practical, evidence-led basics for sleep, movement and mind.', 7, true);

  perform test.equals(
    (select count(*)::int from public.audit_log where action = 'category.create'), 1,
    'the change is recorded in the audit log');
  perform test.equals(
    (select actor_id from public.audit_log where action = 'category.create'), v_admin,
    'the actor is recorded');

  perform test.refuses(
    'update public.audit_log set action = ''something.else''',
    'an audit entry cannot be edited');
  perform test.refuses(
    'delete from public.audit_log',
    'an audit entry cannot be deleted');

  -- Only administrators read it.
  perform test.become(v_mod);
  perform test.equals(
    (select count(*)::int from public.audit_log), 0,
    'a moderator cannot read the audit log');

  perform test.become(v_member);
  perform test.equals(
    (select count(*)::int from public.audit_log), 0,
    'a plain account cannot read the audit log');

  perform test.become_anonymous();
  perform test.refuses(
    'select count(*) from public.audit_log',
    'a signed-out visitor is refused the audit log outright');
end;
$$;
