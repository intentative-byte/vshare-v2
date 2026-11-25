// Real-PostgreSQL concurrency test for record_session_review.
//
// The format-preference recompute rewrites the whole user_format_affinity set
// (delete + insert from a group-by). Two reviews for the SAME user running at
// once must not corrupt it. record_session_review takes a per-user
// transaction-advisory lock, so this proves the invariant holds under
// concurrency: after N concurrent reviews over N distinct eligible sessions
// (all preferring video), video must rest on exactly N observations, with one
// row and no error — and concurrent DUPLICATE reviews of one session add
// nothing.
//
// Usage: DATABASE_URL=postgres://user@host:port/postgres node scripts/test-review-concurrency.mjs
import { execFileSync, execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) { console.error("DATABASE_URL not set"); process.exit(2); }

const NAME = "vshares_concurrency";
const scratch = new URL(adminUrl); scratch.pathname = `/${NAME}`;
const url = scratch.toString();
const SESSIONS = 6;

function psqlAdmin(sql) { execFileSync("psql", ["-X","-v","ON_ERROR_STOP=1","-tAq", adminUrl, "-c", sql], {encoding:"utf8"}); }
function psql(sql) { return execFileSync("psql", ["-X","-v","ON_ERROR_STOP=1","-tAq", url, "-c", sql], {encoding:"utf8"}).trim(); }
function psqlFile(f) { execFileSync("psql", ["-X","-v","ON_ERROR_STOP=1","-q", url, "-f", f], {encoding:"utf8"}); }

try {
  psqlAdmin(`drop database if exists ${NAME} with (force)`);
  psqlAdmin(`create database ${NAME}`);
  const files = ["supabase/tests/harness.sql",
    ...readdirSync("supabase/migrations").filter(f=>f.endsWith(".sql")).sort().map(f=>join("supabase/migrations",f)),
    "supabase/tests/post-migrate.sql"];
  for (const f of files) psqlFile(f);

  // Set up one user with SESSIONS eligible (ended + engaged) sessions.
  const setup = `
  do $$
  declare v_mod uuid; v_user uuid; v_topic uuid; v_card uuid; v_s uuid; i int;
  begin
    perform test.reset();
    v_mod := test.create_user('conc-mod@example.com');
    v_user := test.create_user('conc-user@example.com');
    perform test.become_service();
    insert into public.user_roles(user_id,role) values (v_mod,'moderator');
    insert into public.categories(id,slug,name,description) values ('f7777777-7777-4777-8777-777777777777','concurrency','Concurrency','A category for the concurrency test.');
    v_topic := gen_random_uuid();
    insert into public.topics(id,category_id,slug,name) values (v_topic,'f7777777-7777-4777-8777-777777777777','focus-topic','Focus topic');
    for i in 1..${SESSIONS} loop
      perform test.become(v_mod);
      v_card := public.create_card('conc-card-'||i, v_topic, 'https://e.com/'||i, 'Pub', 'Concurrency learning card '||i,
        'A summary long enough to satisfy the minimum length rule applied to every version here.',
        array['A takeaway long enough to pass.'], 'Do the next step.', 'video', 'beginner', 5, 70);
      perform test.become_service();
      perform public.record_link_check(v_card, true);
      perform test.become(v_mod);
      perform public.moderate_content(v_card, 'approve');
      perform test.become(v_user);
      v_s := public.start_feed_session(v_topic, 7);
      perform public.record_recommendations(v_s, jsonb_build_array(
        jsonb_build_object('contentId', v_card, 'position', 1, 'score', 0.8,
          'components', jsonb_build_object('quality',0.7), 'isDiscovery', false)));
      perform public.set_interaction(v_card, 'complete');
      perform public.end_feed_session(v_s);
      insert into public.conc_fixture(session_id) values (v_s);
    end loop;
    insert into public.conc_user(user_id) values (v_user);
  end $$;`;
  psql(`create table public.conc_fixture(session_id uuid); create table public.conc_user(user_id uuid); grant all on public.conc_fixture, public.conc_user to authenticated, service_role;`);
  psql(setup);

  const userId = psql(`select user_id from public.conc_user limit 1`);
  const sessions = psql(`select session_id from public.conc_fixture order by session_id`).split("\n").filter(Boolean);

  // Fire all SESSIONS reviews concurrently, plus 4 duplicate reviews of the
  // first session, as the authenticated user — separate connections.
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  function review(sessionId) {
    const sql = `set role authenticated; select set_config('request.jwt.claims', '${claims}', false); select public.record_session_review('${sessionId}', true, 5::smallint, 'video');`;
    return execFileAsync("psql", ["-X","-v","ON_ERROR_STOP=1","-tAq", url, "-c", sql]);
  }
  const calls = [...sessions.map(review), ...Array(4).fill(sessions[0]).map(review)];
  const results = await Promise.allSettled(calls);
  const failures = results.filter(r => r.status === "rejected");

  // Verify.
  const obs = psql(`select coalesce((select observations from public.user_format_affinity where user_id='${userId}' and format='video'),-1)`);
  const rows = psql(`select count(*) from public.user_format_affinity where user_id='${userId}'`);
  const affinity = psql(`select affinity from public.user_format_affinity where user_id='${userId}' and format='video'`);
  const expected = Math.round((1 - 0.7 * Math.pow(0.8, SESSIONS)) * 1000) / 1000;

  let ok = true;
  function check(name, pass, detail="") { console.log(`  ${pass?"PASS":"FAIL"}  ${name}${detail?` — ${detail}`:""}`); if(!pass) ok=false; }
  check(`all ${calls.length} concurrent calls succeeded (no deadlock/duplicate-key)`, failures.length===0, `${failures.length} failed`);
  check(`video rests on exactly ${SESSIONS} observations`, obs===String(SESSIONS), `got ${obs}`);
  check(`exactly one format-affinity row`, rows==="1", `got ${rows}`);
  check(`affinity is consistent`, affinity===String(expected), `got ${affinity}, expected ${expected}`);

  psqlAdmin(`drop database if exists ${NAME} with (force)`);
  console.log(`\n${ok?"CONCURRENCY TEST PASSED":"CONCURRENCY TEST FAILED"}`);
  process.exit(ok?0:1);
} catch (e) {
  console.error("Error:", e.message); if(e.stderr) console.error(e.stderr.toString());
  try { psqlAdmin(`drop database if exists ${NAME} with (force)`); } catch {}
  process.exit(1);
}
