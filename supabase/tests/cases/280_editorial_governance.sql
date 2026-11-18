-- Editorial governance: authenticated server-set identity, two-reviewer
-- independent review for high-impact, immutable revision binding, append-only
-- hash-chained ledger with tamper detection. Real functions, real PostgreSQL.
do $$
declare
  v_mod1 uuid;
  v_mod2 uuid;
  v_user uuid;
  v_hi_cat uuid := 'c0c0c0c0-0c0c-40c0-80c0-0c0c0c0c0c0c';
  v_lo_cat uuid := 'd0d0d0d0-0d0d-40d0-80d0-0d0d0d0d0d0d';
  v_hi_topic uuid;
  v_lo_topic uuid;
  v_hi uuid;
  v_lo uuid;
  v_hi_v1 uuid;
  v_hi_v2 uuid;
  v_lo_v uuid;
begin
  perform test.reset();
  v_mod1 := test.create_user('ed-mod1@example.com');
  v_mod2 := test.create_user('ed-mod2@example.com');
  v_user := test.create_user('ed-user@example.com');

  perform test.become_service();
  insert into public.user_roles(user_id, role) values (v_mod1, 'moderator'), (v_mod2, 'moderator');
  insert into public.categories(id, slug, name, description, is_high_impact)
  values (v_hi_cat, 'ed-high', 'Ed High', 'High-impact editorial test category.', true),
         (v_lo_cat, 'ed-low', 'Ed Low', 'Ordinary editorial test category.', false);
  v_hi_topic := gen_random_uuid();
  v_lo_topic := gen_random_uuid();
  insert into public.topics(id, category_id, slug, name)
  values (v_hi_topic, v_hi_cat, 'ed-high-topic', 'Ed High Topic'),
         (v_lo_topic, v_lo_cat, 'ed-low-topic', 'Ed Low Topic');

  perform test.become(v_mod1);
  v_hi := public.create_card('editorial-high-card', v_hi_topic, 'https://example.com/ed-high',
    'Example Publisher', 'A high-impact editorial card',
    'A summary long enough to satisfy the minimum length the database applies to every card version here.',
    array['A takeaway.'], 'Do the suggested thing.', 'article', 'beginner', 8, 70);
  v_lo := public.create_card('editorial-low-card', v_lo_topic, 'https://example.com/ed-low',
    'Example Publisher', 'An ordinary editorial card',
    'A summary long enough to satisfy the minimum length the database applies to every card version here.',
    array['A takeaway.'], 'Do the suggested thing.', 'article', 'beginner', 8, 70);

  perform test.become_service();
  update public.content_items set is_high_impact = true where id = v_hi;
  update public.content_items set is_high_impact = false where id = v_lo;
  select current_version_id into v_hi_v1 from public.content_items where id = v_hi;
  select current_version_id into v_lo_v from public.content_items where id = v_lo;

  -- Only staff may record a decision; identity is the server's, not a parameter.
  perform test.become(v_user);
  perform test.refuses(
    format('select public.record_editorial_decision(%L, %L, %L, %L)', v_hi, v_hi_v1, 'approve', 'A non-staff attempt.'),
    'a non-staff account cannot record an editorial decision');

  -- Non-high-impact: one approval makes the current revision eligible.
  perform test.become(v_mod1);
  perform public.record_editorial_decision(v_lo, v_lo_v, 'approve', 'Reviewed the ordinary card and approve.');
  perform test.ok(public.editorial_publication_eligible(v_lo), 'one approval makes a normal card eligible');

  -- High-impact: one approval is NOT enough.
  perform public.record_editorial_decision(v_hi, v_hi_v1, 'approve', 'First reviewer approves the high-impact card.');
  perform test.ok(not public.editorial_publication_eligible(v_hi), 'high-impact needs a second reviewer');

  -- The same account cannot approve the same revision twice.
  perform test.refuses(
    format('select public.record_editorial_decision(%L, %L, %L, %L)', v_hi, v_hi_v1, 'approve', 'Same reviewer approves again.'),
    'the same reviewer cannot approve a revision twice');

  -- A second, distinct reviewer makes it eligible.
  perform test.become(v_mod2);
  perform public.record_editorial_decision(v_hi, v_hi_v1, 'approve', 'Independent second reviewer approves.');
  perform test.ok(public.editorial_publication_eligible(v_hi), 'two distinct reviewers make a high-impact card eligible');

  -- A revision must belong to the content.
  perform test.refuses(
    format('select public.record_editorial_decision(%L, %L, %L, %L)', v_hi, v_lo_v, 'approve', 'Wrong revision for this content.'),
    'a decision cannot bind a revision from another content item');

  -- Append-only: a client cannot update or delete the ledger.
  perform test.refuses('update public.editorial_decisions set rationale = ''x'' where true', 'a client cannot update the ledger');
  perform test.refuses('delete from public.editorial_decisions where true', 'a client cannot delete from the ledger');

  -- The hash chain is intact for genuine data.
  perform test.become(v_mod1);
  perform test.ok(public.editorial_ledger_valid(v_hi), 'the ledger hash chain is valid');

  -- Tamper detection: forcibly mutate a row (superuser, trigger disabled) and
  -- confirm the hash chain no longer validates.
  execute 'reset role';
  alter table public.editorial_decisions disable trigger editorial_decisions_no_update;
  update public.editorial_decisions set rationale = btrim(rationale) || ' TAMPERED'
    where id = (select id from public.editorial_decisions where content_id = v_hi order by seq asc limit 1);
  alter table public.editorial_decisions enable trigger editorial_decisions_no_update;
  perform test.become(v_mod1);
  perform test.ok(not public.editorial_ledger_valid(v_hi), 'tampering with a row breaks the hash chain');

  -- Revision invalidation: a new revision has no approvals, so eligibility drops.
  perform test.become_service();
  v_hi_v2 := gen_random_uuid();
  insert into public.content_versions(id, content_id, version_no, title, summary, takeaways, next_step, source_name)
  values (v_hi_v2, v_hi, 2, 'A substantially revised high-impact card',
    'A new summary long enough to satisfy the minimum length the database applies to every card version.',
    array['A new takeaway.'], 'Do the new suggested thing.', 'Example Publisher');
  update public.content_items set current_version_id = v_hi_v2 where id = v_hi;
  perform test.become(v_mod1);
  perform test.ok(not public.editorial_publication_eligible(v_hi), 'a new revision invalidates prior approvals');

  -- A client cannot insert into the ledger directly (server-write-only).
  perform test.refuses(
    format('insert into public.editorial_decisions(content_id, content_version_id, reviewer_id, decision, rationale, row_hash) values (%L, %L, %L, %L, %L, %L)',
      v_hi, v_hi_v2, v_mod1, 'approve', 'A direct client insert that should be refused.', 'deadbeef'),
    'a client cannot insert into the ledger directly');
end;
$$;
