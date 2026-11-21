-- Editorial board read contract (Phase 10.13 T6).
--
-- Proves, against real PostgreSQL, what /admin/editorial relies on when it
-- surfaces batch-1-style draft Originals: staff can read the drafts (RLS), a
-- non-staff account cannot, each draft carries an immutable current revision,
-- and every one is reported as NOT publication-ready (link unchecked, 0
-- decisions, eligibility false) — so nothing unverified is shown as verified.
do $$
declare
  v_mod uuid;
  v_other uuid;
  v_cat uuid;
  v_hi_cat uuid;
  v_topic uuid;
  v_hi_topic uuid;
  v_a uuid;
  v_b uuid;
  v_hi uuid;
  v_summary text := 'A summary comfortably longer than the forty-character minimum the database applies to a card version.';
begin
  perform test.reset();
  v_mod := test.create_user('board-mod@example.com');
  v_other := test.create_user('board-other@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  v_cat := gen_random_uuid(); v_hi_cat := gen_random_uuid();
  v_topic := gen_random_uuid(); v_hi_topic := gen_random_uuid();
  insert into public.categories (id, slug, name, description, is_high_impact)
  values (v_cat, 'board-std', 'Board Std', 'Standard category for the board test.', false),
         (v_hi_cat, 'board-hi', 'Board Hi', 'High-impact category for the board test.', true);
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, v_cat, 'board-topic', 'Board Topic'),
         (v_hi_topic, v_hi_cat, 'board-hi-topic', 'Board HiTopic');

  -- A moderator creates batch-1-style drafts (real draft-creation path).
  perform test.become(v_mod);
  v_a := public.create_card('board-card-a', v_topic, 'https://example.com/board-a', 'Example Publisher',
    'Board card A title', v_summary, array['A takeaway.'], 'Do the first step today.');
  v_b := public.create_card('board-card-b', v_topic, 'https://example.com/board-b', 'Example Publisher',
    'Board card B title', v_summary, array['A takeaway.'], 'Do the first step today.');
  v_hi := public.create_card('board-card-hi', v_hi_topic, 'https://example.com/board-hi', 'Example Publisher',
    'Board high-impact card', v_summary, array['A takeaway.'], 'Do the first step today.');

  -- The board read: staff sees all three drafts (status in draft/pending).
  perform test.ok(
    (select count(*) from public.content_items where status in ('draft','pending')) = 3,
    'a staff reviewer sees the draft Originals on the board');

  -- Each draft carries an immutable current revision (the binding target).
  perform test.ok(
    (select count(*) from public.content_items ci
      join public.content_versions v on v.id = ci.current_version_id
      where ci.status = 'draft') = 3,
    'every draft has a current revision to bind decisions to');

  -- None is publication-ready: link unchecked, no decisions, not eligible.
  perform test.ok(
    (select bool_and(link_checked_at is null) from public.content_items where status='draft'),
    'every draft is link-unchecked (not verified)');
  perform test.equals(public.editorial_publication_eligible(v_a), false, 'a fresh draft is not publication-eligible');
  perform test.equals(public.editorial_publication_eligible(v_hi), false, 'a high-impact draft is not publication-eligible');
  perform test.ok(
    (select count(*) from public.editorial_decisions) = 0,
    'no editorial decisions exist yet');

  -- Record one authenticated decision so the ledger has a row to gate on.
  perform public.record_editorial_decision(
    v_a, (select current_version_id from public.content_items where id = v_a),
    'request_revision', 'Reviewer asks for a clearer first takeaway before approval.');
  perform test.equals((select count(*)::int from public.editorial_decisions), 1,
    'a staff reviewer sees the recorded decision in the ledger');

  -- A non-staff account that did not submit them sees NONE of the drafts, and
  -- none of the ledger (RLS filters silently, it does not error).
  perform test.become(v_other);
  perform test.equals(
    (select count(*)::int from public.content_items where status in ('draft','pending')),
    0,
    'a non-staff account cannot see the draft board');
  perform test.equals(
    (select count(*)::int from public.editorial_decisions),
    0,
    'a non-staff account cannot see the editorial ledger');
end;
$$;
