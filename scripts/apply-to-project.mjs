// Applies the VSHARES schema and seed data to a Supabase (or any PostgreSQL)
// development project.
//
// It applies ONLY the real migrations and the seed files, in order. It never
// applies the test harness or the post-migrate grants — those stand in for
// what a real platform already provides and must not touch a real project
// (CLAUDE.md).
//
// Usage (against the project's DIRECT Postgres connection string, the one the
// Supabase dashboard shows under Settings → Database → Connection string):
//   DATABASE_URL=postgres://postgres:...@db.<ref>.supabase.co:5432/postgres \
//     node scripts/apply-to-project.mjs --confirm
//
//   Add --seed to also load the taxonomy and the ten draft cards.
//   Add --dry-run to list what would be applied and exit.
//
// Migrations are not idempotent (they CREATE tables), so this is for a fresh
// project. To re-apply after a change, use a fresh database, or the Supabase
// CLI (`supabase db push`) which tracks applied migrations. The seed files
// ARE idempotent and can be re-run.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const confirm = process.argv.includes("--confirm");
const seed = process.argv.includes("--seed");
const dryRun = process.argv.includes("--dry-run");

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Use the project's direct connection string.");
  process.exit(2);
}

// Safety: never run against the local test scratch database.
if (/vshares_db_tests|vshares_drill|vshares_perf|vshares_analytics/.test(databaseUrl)) {
  console.error("Refusing: DATABASE_URL points at a local test database, not a project.");
  process.exit(2);
}

const migrations = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => join("supabase/migrations", f));

const seeds = readdirSync("supabase/seed")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => join("supabase/seed", f));

const plan = [...migrations, ...(seed ? seeds : [])];

console.log("Will apply, in order:\n");
for (const file of plan) console.log(`  ${file}`);
console.log(
  `\nThe test harness and post-migrate grants are deliberately NOT applied.\n` +
    `Target: ${databaseUrl.replace(/:[^:@/]+@/, ":****@")}\n`,
);

if (dryRun) {
  console.log("Dry run — nothing applied.");
  process.exit(0);
}

if (!confirm) {
  console.error("Add --confirm to apply. (Add --seed to include the catalogue.)");
  process.exit(2);
}

for (const file of plan) {
  process.stdout.write(`applying ${file} ... `);
  try {
    execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", databaseUrl, "-f", file], {
      encoding: "utf8",
    });
    console.log("ok");
  } catch (error) {
    console.log("FAILED");
    console.error(error.stderr?.toString() ?? error.message);
    process.exit(1);
  }
}

console.log("\nDone. Next: bootstrap a staff account (scripts/bootstrap-staff.mjs),");
console.log("and, from an environment with network access, run scripts/check-links.mjs");
console.log("before any card can be published.");
