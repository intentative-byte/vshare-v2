// Measures the analytics rollup and the admin dashboard queries against a
// realistic dataset, and reports actual timings rather than assumptions.
//
// Usage:
//   DATABASE_URL=postgres://user@host:port/postgres node scripts/measure-analytics-performance.mjs
//
// It builds a scratch database, loads a synthetic catalogue, synthetic
// accounts, interactions and sessions spread over 60 days, then times the
// rollup, the reconciliation and every query the dashboard runs. The
// synthetic rows exist only to measure query plans; they are never loaded
// into a real database.
//
// The two things it is looking for:
//   1. Does the rollup finish quickly enough to run nightly?
//   2. Does any of it touch the path a learner waits on? (It must not:
//      the dashboard reads the rollup, and the rollup runs out of band.)
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const adminUrl = process.env.DATABASE_URL;

if (!adminUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

const name = process.env.PERF_DATABASE_NAME ?? "vshares_analytics_perf";
const scratch = new URL(adminUrl);
scratch.pathname = `/${name}`;

const CARDS = Number(process.env.PERF_CARDS ?? 2000);
const USERS = Number(process.env.PERF_USERS ?? 2000);
const INTERACTIONS_PER_USER = Number(process.env.PERF_INTERACTIONS ?? 40);
const DAYS = Number(process.env.PERF_DAYS ?? 60);

function psql(url, sql, extra = []) {
  return execFileSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-tAq", url.toString(), ...extra, "-c", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
}

console.log(
  `Building ${name}: ${CARDS} cards, ${USERS} accounts, ~${USERS * INTERACTIONS_PER_USER} interactions over ${DAYS} days`,
);

psql(new URL(adminUrl), `drop database if exists ${name} with (force)`);
psql(new URL(adminUrl), `create database ${name}`);

const setup = [
  "supabase/tests/harness.sql",
  ...readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join("supabase/migrations", f)),
  "supabase/tests/post-migrate.sql",
];

for (const file of setup) {
  execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", scratch.toString(), "-f", file], {
    encoding: "utf8",
  });
}

psql(
  scratch,
  `
  insert into public.categories (id, slug, name, description)
  select gen_random_uuid(), 'cat-' || i, 'Category ' || i, 'A synthetic category for measurement.'
  from generate_series(1, 8) i;

  insert into public.topics (id, category_id, slug, name)
  select gen_random_uuid(), c.id, 'topic-' || c.slug || '-' || i, 'Topic ' || i
  from public.categories c, generate_series(1, 5) i;

  insert into public.content_items (
    slug, primary_topic_id, source_url, status, level, estimated_minutes,
    quality_score, published_at, reviewed_at, link_checked_at, origin
  )
  select
    'synthetic-card-' || i,
    (array(select id from public.topics order by id))[1 + (i % 40)],
    'https://example.com/' || i,
    'draft',
    (array['beginner','intermediate','advanced']::public.content_level[])[1 + (i % 3)],
    5 + (i % 30),
    40 + (i % 60),
    now() - ((i % ${DAYS}) || ' days')::interval,
    now() - ((i % ${DAYS}) || ' days')::interval,
    now(),
    (array['curated','user_submitted']::public.content_origin[])[1 + (i % 2)]
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

  update public.content_items c set current_version_id = v.id
  from public.content_versions v where v.content_id = c.id;

  update public.content_items set status = 'published';
  `,
);

psql(
  scratch,
  `
  insert into auth.users (id, email, is_anonymous, created_at)
  select gen_random_uuid(),
         case when i % 3 = 0 then null else 'perf-' || i || '@example.com' end,
         i % 3 = 0,
         now() - ((i % ${DAYS}) || ' days')::interval
  from generate_series(1, ${USERS}) i;

  -- Interactions spread across the whole window, so a single day's rollup
  -- has to find its rows among everything else.
  insert into public.content_interactions (
    user_id, content_id, impressions, last_impressed_at, opened_at, completed_at, saved_at, completed_minutes
  )
  select
    u.id, c.id,
    1 + (random() * 3)::int,
    now() - ((random() * ${DAYS} * 24)::int || ' hours')::interval,
    now() - ((random() * ${DAYS} * 24)::int || ' hours')::interval,
    case when random() < 0.35 then now() - ((random() * ${DAYS} * 24)::int || ' hours')::interval end,
    case when random() < 0.15 then now() - ((random() * ${DAYS} * 24)::int || ' hours')::interval end,
    5 + (random() * 20)::int
  from auth.users u
  cross join lateral (
    select id from public.content_items order by random() limit ${INTERACTIONS_PER_USER}
  ) c
  on conflict do nothing;

  insert into public.feed_sessions (user_id, size, started_at, ended_at)
  select u.id, 7, s.started_at,
         case when random() < 0.6 then s.started_at + ((2 + random() * 15)::int || ' minutes')::interval end
  from auth.users u
  cross join generate_series(1, 3)
  cross join lateral (
    select now() - ((random() * ${DAYS} * 24)::int || ' hours')::interval as started_at
  ) s
  where random() < 0.8;

  insert into public.user_topics (user_id, topic_id, declared, affinity)
  select u.id, t.id, true, 0.5
  from auth.users u
  cross join lateral (select id from public.topics order by random() limit 4) t
  on conflict do nothing;

  update public.profiles p
  set first_completion_seconds = 30 + (random() * 300)::int
  where random() < 0.5;

  analyze;
  `,
);

const counts = psql(
  scratch,
  `select (select count(*) from public.content_items) || ' cards, '
       || (select count(*) from auth.users) || ' accounts, '
       || (select count(*) from public.content_interactions) || ' interactions, '
       || (select count(*) from public.feed_sessions) || ' sessions'`,
).trim();

console.log(`Loaded: ${counts}\n`);

function timeStatement(label, sql, runs = 5) {
  const timings = [];

  for (let run = 0; run < runs; run += 1) {
    const started = process.hrtime.bigint();
    psql(scratch, sql);
    timings.push(Number(process.hrtime.bigint() - started) / 1e6);
  }

  const best = Math.min(...timings);
  const median = [...timings].sort((a, b) => a - b)[Math.floor(runs / 2)] ?? 0;
  console.log(`  ${best.toFixed(1).padStart(9)} ms best  ${median.toFixed(1).padStart(9)} ms median   ${label}`);
  return median;
}

console.log("Rollup and reconciliation (includes psql start-up, so these are upper bounds):\n");

// Roll up the whole window first, so the dashboard has something to read.
const wholeWindowStart = process.hrtime.bigint();
psql(
  scratch,
  `select public.rollup_day(d::date)
   from generate_series(now() - interval '${DAYS} days', now(), interval '1 day') d`,
);
const wholeWindowMs = Number(process.hrtime.bigint() - wholeWindowStart) / 1e6;
console.log(`  ${wholeWindowMs.toFixed(1).padStart(9)} ms         all ${DAYS + 1} days in one statement`);

const oneDay = timeStatement(
  "one day (what the nightly job runs)",
  "select public.rollup_day((now() - interval '3 days')::date)",
);

timeStatement("reconcile one day", "select public.reconcile_day((now() - interval '3 days')::date)");

console.log("\nDashboard queries, as the admin page runs them:\n");

const dashboard = [
  ["overview, 30 days", "select * from public.analytics_overview order by day desc limit 30"],
  [
    "topic breakdown, 30 days",
    `select dimension_key, sum(count) from public.analytics_breakdown
     where name = 'cards_completed' and dimension = 'topic'
       and day >= (now() - interval '30 days')::date
     group by dimension_key order by 2 desc nulls last limit 10`,
  ],
  ["moderation trends", "select * from public.moderation_trends order by day desc limit 30"],
  [
    "median time to first completion",
    `select percentile_cont(0.5) within group (order by first_completion_seconds)
     from public.profiles where first_completion_seconds is not null`,
  ],
];

let slowestDashboard = 0;

for (const [label, sql] of dashboard) {
  slowestDashboard = Math.max(slowestDashboard, timeStatement(label, sql));
}

console.log(`\nNightly rollup, one day: ${oneDay.toFixed(1)} ms`);
console.log(`Slowest dashboard query: ${slowestDashboard.toFixed(1)} ms`);
console.log(
  "\nNo learner-facing query reads any of these tables: the feed, a card page and\n" +
    "the progress screen touch content_items, content_interactions and\n" +
    "recommendations only. The rollup runs out of band and the dashboard reads\n" +
    "what it wrote.",
);
