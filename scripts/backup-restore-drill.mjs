// A backup-and-restore drill against a real PostgreSQL server.
//
// This is not a documented procedure — it is an executed one. It builds a
// populated database, dumps it, drops it, restores it into a fresh database,
// and then checks that what came back is what went in: row counts, a content
// checksum, that row-level security survived, that the functions still run,
// and that a later migration still applies on top of the restore.
//
// Usage:
//   DATABASE_URL=postgres://user@host:port/postgres node scripts/backup-restore-drill.mjs
//
// It never touches a production database: it creates and drops two scratch
// databases named below.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

const SOURCE = "vshares_drill_source";
const RESTORED = "vshares_drill_restored";
const workDir = mkdtempSync(join(tmpdir(), "vshares-drill-"));
const dumpFile = join(workDir, "backup.dump");

function urlFor(db) {
  const u = new URL(adminUrl);
  u.pathname = `/${db}`;
  return u.toString();
}

function psql(db, sql) {
  return execFileSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-tAq", urlFor(db), "-c", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ).trim();
}

function psqlFile(db, file) {
  execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", urlFor(db), "-f", file], {
    encoding: "utf8",
  });
}

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const migrations = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

try {
  console.log("1. Build and populate the source database\n");
  psql("postgres", `drop database if exists ${SOURCE} with (force)`);
  psql("postgres", `create database ${SOURCE}`);

  // The harness stands in for platform-provided pieces (auth schema, roles);
  // a real backup of a hosted project would already include them, so this is
  // the honest local equivalent.
  psqlFile(SOURCE, "supabase/tests/harness.sql");
  // All but the last migration, so we can prove a later migration still
  // applies on top of a restore.
  const held = migrations[migrations.length - 1];
  for (const file of migrations.slice(0, -1)) {
    psqlFile(SOURCE, join("supabase/migrations", file));
  }
  psqlFile(SOURCE, "supabase/tests/post-migrate.sql");

  // Populate: a category, a topic, a published card, two users, interactions.
  const seed = join(workDir, "seed.sql");
  writeFileSync(
    seed,
    `
    -- Two accounts; one is a moderator who creates and publishes a card
    -- through the real functions, so the seed exercises the same path a
    -- real database was populated by, constraints and all.
    insert into auth.users (id, email, is_anonymous) values
      ('0aaaaa00-0000-4000-8000-000000000001', 'drill-a@example.com', false),
      ('0aaaaa00-0000-4000-8000-000000000002', 'drill-mod@example.com', false);

    insert into public.user_roles (user_id, role)
      values ('0aaaaa00-0000-4000-8000-000000000002', 'admin');

    -- As the admin: a category and a topic.
    select set_config('request.jwt.claims', json_build_object('sub','0aaaaa00-0000-4000-8000-000000000002','role','authenticated')::text, false);
    set role authenticated;
    select public.upsert_category('productivity', 'Productivity', 'Doing what matters without theatre.');
    select public.upsert_topic(
      (select id from public.categories where slug = 'productivity'),
      'focus', 'Focus');

    -- As a moderator (the same account also holds admin here for brevity):
    -- create a draft card, have the service check its link, then publish.
    select public.create_card('a-restored-card',
      (select id from public.topics where slug = 'focus'),
      'https://example.com/x', 'Example Publisher', 'A card that survives a restore',
      'A summary long enough to satisfy the minimum length constraint applied to every version here.',
      array['A takeaway long enough to pass.'], 'Do the next step.', 'article', 'beginner', 8, 70);

    reset role;
    select set_config('request.jwt.claims', '', false);
    set role service_role;
    select public.record_link_check((select id from public.content_items where slug = 'a-restored-card'), true);
    reset role;

    select set_config('request.jwt.claims', json_build_object('sub','0aaaaa00-0000-4000-8000-000000000002','role','authenticated')::text, false);
    set role authenticated;
    select public.moderate_content((select id from public.content_items where slug = 'a-restored-card'), 'approve');
    reset role;
    select set_config('request.jwt.claims', '', false);

    -- One completion, so an interaction row exists to restore.
    set role service_role;
    insert into public.content_interactions (user_id, content_id, completed_at)
      values ('0aaaaa00-0000-4000-8000-000000000001',
              (select id from public.content_items where slug = 'a-restored-card'), now());
    reset role;
  `,
  );
  psqlFile(SOURCE, seed);

  const sourceUsers = psql(SOURCE, "select count(*) from auth.users");
  const sourceCards = psql(SOURCE, "select count(*) from public.content_items");
  const sourceChecksum = psql(
    SOURCE,
    "select md5(string_agg(title, '|' order by id::text)) from public.content_versions",
  );
  console.log(`  source: ${sourceUsers} users, ${sourceCards} cards\n`);

  console.log("2. Take the backup (pg_dump, custom format)\n");
  execFileSync("pg_dump", ["-Fc", "-f", dumpFile, urlFor(SOURCE)], { encoding: "utf8" });
  const dumpSize = execFileSync("stat", ["-c", "%s", dumpFile]).toString().trim();
  check("backup file was produced", Number(dumpSize) > 0, `${dumpSize} bytes`);

  console.log("\n3. Drop the source and restore into a fresh database\n");
  psql("postgres", `drop database if exists ${SOURCE} with (force)`);
  psql("postgres", `drop database if exists ${RESTORED} with (force)`);
  psql("postgres", `create database ${RESTORED}`);
  // pg_restore exits non-zero on benign notices (ownership of roles the
  // scratch db does not have); --no-owner avoids that, and ON_ERROR_STOP is
  // not set so a missing-role comment does not abort a good restore.
  execFileSync("pg_restore", ["--no-owner", "--no-acl", "-d", urlFor(RESTORED), dumpFile], {
    encoding: "utf8",
  });

  console.log("4. Verify the restore\n");
  const restoredUsers = psql(RESTORED, "select count(*) from auth.users");
  const restoredCards = psql(RESTORED, "select count(*) from public.content_items");
  const restoredChecksum = psql(
    RESTORED,
    "select md5(string_agg(title, '|' order by id::text)) from public.content_versions",
  );

  check("user rows match", restoredUsers === sourceUsers, `${restoredUsers} vs ${sourceUsers}`);
  check("card rows match", restoredCards === sourceCards, `${restoredCards} vs ${sourceCards}`);
  check("content checksum matches", restoredChecksum === sourceChecksum, restoredChecksum.slice(0, 12));

  // Integrity: the published card still joins to its current version.
  const joined = psql(
    RESTORED,
    "select v.title from public.content_items c join public.content_versions v on v.id = c.current_version_id where c.slug = 'a-restored-card'",
  );
  check("the published card still resolves its version", joined === "A card that survives a restore", joined);

  // Row-level security survived the restore (it is schema, so it should).
  const rlsOn = psql(
    RESTORED,
    "select bool_and(relrowsecurity) from pg_class where relname in ('profiles','content_interactions','analytics_events','learner_milestones')",
  );
  check("row-level security is still enabled on its tables", rlsOn === "t", `bool_and=${rlsOn}`);

  // A security-definer function from the restored (not held-back) migrations
  // still runs. app.current_user_id() is in the baseline and returns null
  // with no claims set, which is exactly what it should do.
  const currentUser = psql(RESTORED, "select coalesce(app.current_user_id()::text, 'null')");
  check("security-definer functions still execute", currentUser === "null", `current_user_id=${currentUser}`);

  // The policy count came back.
  const policies = psql(RESTORED, "select count(*) from pg_policies where schemaname = 'public'");
  check("row-level security policies were restored", Number(policies) > 20, `${policies} policies`);

  console.log("\n5. Schema-migration compatibility: the held-back migration still applies\n");
  psqlFile(RESTORED, join("supabase/migrations", held));
  const afterMigration = psql(RESTORED, "select count(*) from public.content_items");
  check(
    "a later migration applies cleanly on top of the restore",
    afterMigration === sourceCards,
    `held: ${held}`,
  );

  console.log("\n6. Clean up\n");
  psql("postgres", `drop database if exists ${RESTORED} with (force)`);

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
} catch (error) {
  console.error("\nDrill failed:", error.message);
  if (error.stderr) console.error(error.stderr.toString());
  process.exit(1);
}
