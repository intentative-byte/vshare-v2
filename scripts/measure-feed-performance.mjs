// Measures the queries the Value Feed depends on, against a realistic
// dataset, and reports actual timings rather than assumptions.
//
// Usage:
//   DATABASE_URL=postgres://user@host:port/postgres node scripts/measure-feed-performance.mjs
//
// It builds a scratch database, loads a synthetic catalogue and synthetic
// interaction history, and runs each query several times under EXPLAIN
// ANALYZE. The synthetic rows exist only to measure query plans; they are
// never loaded into a real database and never influence a real ranking.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const adminUrl = process.env.DATABASE_URL;

if (!adminUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

const name = process.env.PERF_DATABASE_NAME ?? "vshares_perf";
const scratch = new URL(adminUrl);
scratch.pathname = `/${name}`;

const CARDS = Number(process.env.PERF_CARDS ?? 5000);
const USERS = Number(process.env.PERF_USERS ?? 500);
const INTERACTIONS_PER_USER = Number(process.env.PERF_INTERACTIONS ?? 60);

function psql(url, sql, extra = []) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-tAq", url.toString(), ...extra, "-c", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

console.log(`Building ${name}: ${CARDS} cards, ${USERS} users, ~${USERS * INTERACTIONS_PER_USER} interactions`);

psql(new URL(adminUrl), `drop database if exists ${name} with (force)`);
psql(new URL(adminUrl), `create database ${name}`);

const setup = [
  "supabase/tests/harness.sql",
  ...readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()
    .map((f) => join("supabase/migrations", f)),
  "supabase/tests/post-migrate.sql",
];

for (const file of setup) {
  execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", scratch.toString(), "-f", file], {
    encoding: "utf8",
  });
}

// Synthetic catalogue and history. Published through the same columns the
// real thing uses, so the plans are the plans the product will get.
psql(
  scratch,
  `
  insert into public.categories (id, slug, name, description)
  select gen_random_uuid(), 'cat-' || i, 'Category ' || i, 'A synthetic category for measurement.'
  from generate_series(1, 8) i;

  insert into public.topics (id, category_id, slug, name)
  select gen_random_uuid(), c.id, 'topic-' || c.slug || '-' || i, 'Topic ' || i
  from public.categories c, generate_series(1, 5) i;

  -- Loaded as drafts first: the database refuses to publish anything that
  -- has no version, which is exactly the rule we want in force.
  insert into public.content_items (
    slug, primary_topic_id, source_url, status, level, estimated_minutes,
    quality_score, published_at, reviewed_at, link_checked_at
  )
  select
    'synthetic-card-' || i,
    (array(select id from public.topics order by id))[1 + (i % 40)],
    'https://example.com/' || i,
    'draft',
    (array['beginner','intermediate','advanced']::public.content_level[])[1 + (i % 3)],
    5 + (i % 30),
    40 + (i % 60),
    now() - (i || ' hours')::interval,
    now(),
    now()
  from generate_series(1, ${CARDS}) i;

  insert into public.content_versions (content_id, version_no, title, summary, takeaways, next_step, source_name)
  select
    c.id, 1,
    'A synthetic card title number ' || row_number() over (),
    'A synthetic summary long enough to satisfy the minimum length constraint applied to every version.',
    array['A synthetic takeaway long enough to pass.'],
    'Do the synthetic next step.',
    'Publisher ' || (row_number() over () % 50)
  from public.content_items c;

  update public.content_items c
  set current_version_id = v.id
  from public.content_versions v
  where v.content_id = c.id;

  -- Now that every card has a version, a reviewer and a checked link, the
  -- publication constraint is satisfied.
  update public.content_items set status = 'published';

  insert into public.auth_users_placeholder as t (x) select 1 where false;
  `.replace("insert into public.auth_users_placeholder as t (x) select 1 where false;", ""),
);

psql(
  scratch,
  `
  insert into auth.users (id, email, is_anonymous)
  select gen_random_uuid(), 'perf-' || i || '@example.com', false
  from generate_series(1, ${USERS}) i;

  insert into public.content_interactions (user_id, content_id, impressions, last_impressed_at, completed_at)
  select
    u.id,
    c.id,
    1 + (random() * 3)::int,
    now() - ((random() * 200)::int || ' hours')::interval,
    case when random() < 0.3 then now() - ((random() * 100)::int || ' hours')::interval else null end
  from auth.users u
  cross join lateral (
    select id from public.content_items order by random() limit ${INTERACTIONS_PER_USER}
  ) c
  on conflict do nothing;

  insert into public.user_topics (user_id, topic_id, declared, affinity)
  select u.id, t.id, true, 0.5
  from auth.users u
  cross join lateral (select id from public.topics order by random() limit 4) t
  on conflict do nothing;

  analyze;
  `,
);

const counts = psql(
  scratch,
  `select (select count(*) from public.content_items) || ' cards, '
       || (select count(*) from public.content_interactions) || ' interactions, '
       || (select count(*) from public.user_topics) || ' topic preferences'`,
).trim();

console.log(`Loaded: ${counts}\n`);

const sampleUser = psql(scratch, "select id from auth.users limit 1").trim();

const queries = [
  {
    name: "Candidate pool (one topic, exclusions applied)",
    sql: `
      select c.id, c.primary_topic_id, c.quality_score, c.level, c.estimated_minutes,
             c.published_at, s.impressions, s.completions
      from public.content_items c
      left join public.content_stats s on s.content_id = c.id
      where c.status = 'published'
        and c.id not in (
          select content_id from public.content_interactions
          where user_id = '${sampleUser}'
            and (completed_at is not null or skipped_at is not null)
        )
      order by c.published_at desc
      limit 200`,
  },
  {
    name: "Viewer memory (topics and interactions)",
    sql: `
      select (select count(*) from public.user_topics where user_id = '${sampleUser}')
           + (select count(*) from public.content_interactions where user_id = '${sampleUser}')`,
  },
  {
    name: "Saved library",
    sql: `
      select content_id, saved_at from public.content_interactions
      where user_id = '${sampleUser}' and saved_at is not null
      order by saved_at desc limit 100`,
  },
  {
    name: "Progress summary (completions only)",
    sql: `
      select count(*), coalesce(sum(completed_minutes), 0)
      from public.content_interactions
      where user_id = '${sampleUser}' and completed_at is not null`,
  },
  {
    name: "Published card by slug",
    sql: `
      select c.id, v.title from public.content_items c
      join public.content_versions v on v.id = c.current_version_id
      where c.slug = 'synthetic-card-2500' and c.status = 'published'`,
  },
];

const runs = 5;
console.log(`Each query, best of ${runs} runs under EXPLAIN ANALYZE:\n`);

let slowest = 0;

for (const query of queries) {
  const timings = [];

  for (let run = 0; run < runs; run += 1) {
    const output = psql(scratch, `explain (analyze, timing off, summary on) ${query.sql}`);
    const match = /Execution Time: ([\d.]+) ms/.exec(output);
    timings.push(match ? Number(match[1]) : Number.NaN);
  }

  const best = Math.min(...timings);
  const median = [...timings].sort((a, b) => a - b)[Math.floor(runs / 2)];
  slowest = Math.max(slowest, median ?? 0);

  console.log(
    `  ${best.toFixed(2).padStart(8)} ms best  ${(median ?? 0).toFixed(2).padStart(8)} ms median   ${query.name}`,
  );
}

console.log(`\nSlowest median: ${slowest.toFixed(2)} ms`);
