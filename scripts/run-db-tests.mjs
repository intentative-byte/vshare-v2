// Applies the migrations to a scratch PostgreSQL database and runs the
// policy and function tests against it.
//
// These are real database tests: real PostgreSQL, the real migrations, and
// the same `request.jwt.claims` setting the API layer sets per request.
// Nothing here is mocked.
//
// Usage:
//   DATABASE_URL=postgres://user@host:port/postgres node scripts/run-db-tests.mjs
//
// The URL must point at a database server you are happy to create and drop a
// scratch database on. It is never a production database.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const adminUrl = process.env.DATABASE_URL;

if (!adminUrl) {
  console.error("DATABASE_URL is not set. See docs/VSHARES_ARCHITECTURE.md for local setup.");
  process.exit(2);
}

const scratchName = process.env.TEST_DATABASE_NAME ?? "vshares_db_tests";
const scratchUrl = new URL(adminUrl);
scratchUrl.pathname = `/${scratchName}`;

function psql(url, args, { capture = true } = {}) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", url.toString(), ...args], {
    encoding: "utf8",
    stdio: capture ? ["pipe", "pipe", "pipe"] : "inherit",
  });
}

function sqlFiles(directory) {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => join(directory, name));
}

console.log(`Preparing scratch database ${scratchName}`);

try {
  psql(new URL(adminUrl), ["-c", `drop database if exists ${scratchName} with (force)`]);
  psql(new URL(adminUrl), ["-c", `create database ${scratchName}`]);
} catch (error) {
  console.error("Could not prepare the scratch database.");
  console.error(error.stderr ?? error.message);
  process.exit(2);
}

// The harness stands in for what the platform provides; the migrations are
// the real ones, applied in order, exactly as they would be anywhere else.
const setupFiles = [
  "supabase/tests/harness.sql",
  ...sqlFiles("supabase/migrations"),
  "supabase/tests/post-migrate.sql",
];

for (const file of setupFiles) {
  try {
    psql(scratchUrl, ["-f", file]);
    console.log(`  applied ${file}`);
  } catch (error) {
    console.error(`FAILED to apply ${file}`);
    console.error(error.stderr ?? error.message);
    process.exit(1);
  }
}

const cases = sqlFiles("supabase/tests/cases");
let failed = 0;
let assertions = 0;

console.log(`\nRunning ${cases.length} database test files\n`);

for (const file of cases) {
  const name = file.split("/").pop();

  // Each file runs in its own transaction that is rolled back, so one
  // file's data can never influence another's result. Assertions report
  // through notices, which psql writes to stderr, so both streams are read.
  const run = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", scratchUrl.toString()], {
    encoding: "utf8",
    input: `begin;\n\\i ${file}\nrollback;\n`,
  });

  const combined = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  const count = (combined.match(/ok: /g) ?? []).length;

  if (run.status === 0) {
    assertions += count;
    console.log(`  PASS  ${name} (${count} assertions)`);
  } else {
    failed += 1;
    assertions += count;
    console.log(`  FAIL  ${name} (${count} assertions passed before the failure)`);
    console.log(
      combined
        .split("\n")
        .filter((line) => line.trim() !== "" && !line.includes("ok: "))
        .map((line) => `        ${line}`)
        .join("\n"),
    );
  }
}

console.log(
  `\n${cases.length - failed}/${cases.length} files passed, ${assertions} assertions, ${failed} failed`,
);

process.exit(failed > 0 ? 1 : 0);
