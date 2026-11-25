-- Factory → catalogue bridge, verified against real PostgreSQL (Phase 10.13 T5).
--
-- The bridge (toCreateCardInput, unit-tested in TS) produces exactly the
-- arguments public.create_card accepts. This proves the DB half of that
-- contract: a bridged card can ONLY enter as a draft with an unchecked link,
-- the publication gates cannot be bypassed, a missing topic / duplicate / wrong
-- role is refused, and RLS/permissions are unchanged.
do $$
declare
  v_mod uuid;
  v_user uuid;
  v_cat uuid;
  v_hi_cat uuid;
  v_topic uuid;
  v_hi_topic uuid;
  v_card uuid;
  v_hi_card uuid;
begin
  perform test.reset();
  v_mod := test.create_user('fb-mod@example.com');
  v_user := test.create_user('fb-user@example.com');

  perform test.become_service();
  insert into public.user_roles (user_id, role) values (v_mod, 'moderator');
  v_cat := gen_random_uuid();
  v_hi_cat := gen_random_uuid();
  v_topic := gen_random_uuid();
  v_hi_topic := gen_random_uuid();
  insert into public.categories (id, slug, name, description, is_high_impact)
  values (v_cat, 'fb-standard', 'FB Standard', 'A standard category for the bridge test.', false),
         (v_hi_cat, 'fb-high', 'FB High', 'A high-impact category for the bridge test.', true);
  insert into public.topics (id, category_id, slug, name)
  values (v_topic, v_cat, 'fb-topic', 'FB Topic'),
         (v_hi_topic, v_hi_cat, 'fb-hi-topic', 'FB HiTopic');

  -- Role is preserved: a non-moderator cannot create a card at all.
  perform test.become(v_user);
  perform test.refuses(
    format(
      'select public.create_card(%L, %L, %L, %L, %L, %L, array[%L], %L)',
      'bridge-card-one', v_topic, 'https://example.com/bridge-1', 'Example Publisher',
      'A bridged draft card title',
      'A summary comfortably longer than the forty-character minimum the database applies to a card version.',
      'A takeaway.', 'Do the first step today.'),
    'a non-moderator cannot create a card');

  -- A bridged card (the exact shape toCreateCardInput produces) enters as a
  -- DRAFT, link-unchecked and unpublished.
  perform test.become(v_mod);
  v_card := public.create_card(
    p_slug => 'bridge-card-one',
    p_primary_topic_id => v_topic,
    p_source_url => 'https://example.com/bridge-1',
    p_source_name => 'Example Publisher',
    p_title => 'A bridged draft card title',
    p_summary => 'A summary comfortably longer than the forty-character minimum the database applies to a card version.',
    p_takeaways => array['A takeaway.'],
    p_next_step => 'Do the first step today.',
    p_format => 'article',
    p_level => 'beginner',
    p_estimated_minutes => 8,
    p_quality_score => 72,
    p_is_ai_assisted => true,
    p_source_author => 'A. Writer');
  perform test.equals((select status from public.content_items where id = v_card), 'draft',
    'a bridged card enters as a draft');
  perform test.ok((select link_checked_at from public.content_items where id = v_card) is null,
    'a bridged card is link-unchecked');
  perform test.ok((select published_at from public.content_items where id = v_card) is null,
    'a bridged card is not published');
  perform test.ok((select is_ai_assisted from public.content_items where id = v_card),
    'the AI-assisted flag is preserved');

  -- Missing taxonomy: a non-existent topic is refused.
  perform test.refuses(
    format(
      'select public.create_card(%L, %L, %L, %L, %L, %L, array[%L], %L)',
      'bridge-missing-topic', gen_random_uuid(), 'https://example.com/bridge-missing', 'Example Publisher',
      'A card with a bogus topic',
      'A summary comfortably longer than the forty-character minimum the database applies to a card version.',
      'A takeaway.', 'Do the first step today.'),
    'a card with a non-existent topic is refused (missing taxonomy)');

  -- Duplicate source URL: the database UNIQUE mirrors the factory dedup.
  perform test.refuses(
    format(
      'select public.create_card(%L, %L, %L, %L, %L, %L, array[%L], %L)',
      'bridge-card-dup', v_topic, 'https://example.com/bridge-1', 'Example Publisher',
      'A duplicate-source card',
      'A summary comfortably longer than the forty-character minimum the database applies to a card version.',
      'A takeaway.', 'Do the first step today.'),
    'a duplicate source URL is refused by the database');

  -- Publication gate: approving a card whose link is unchecked is refused.
  perform test.refuses(
    format('select public.moderate_content(%L, %L)', v_card, 'approve'),
    'a card whose link is unchecked cannot be published');

  -- High-impact gate: the author cannot approve their own high-impact card, even
  -- once its link is checked (the two-person rule is not bypassable).
  v_hi_card := public.create_card(
    p_slug => 'bridge-hi-card',
    p_primary_topic_id => v_hi_topic,
    p_source_url => 'https://example.com/bridge-hi',
    p_source_name => 'Example Publisher',
    p_title => 'A high-impact bridged card',
    p_summary => 'A summary comfortably longer than the forty-character minimum the database applies to a card version.',
    p_takeaways => array['A takeaway.'],
    p_next_step => 'Do the first step today.');
  perform test.become_service();
  update public.content_items set link_checked_at = now() where id = v_hi_card;
  perform test.become(v_mod);
  perform test.refuses(
    format('select public.moderate_content(%L, %L)', v_hi_card, 'approve'),
    'the author cannot approve their own high-impact card');

  -- Nothing created here is published.
  perform test.become_service();
  perform test.equals((select count(*)::int from public.content_items where status = 'published'), 0,
    'no card is published by the bridge path');
end;
$$;
