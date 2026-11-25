// Checks that every catalogue source link is reachable, and records the
// result in the database.
//
// A card cannot be published until this has recorded a successful check:
// the database refuses to approve one whose link_checked_at is null, and
// only a privileged client may set it. That is deliberate — it means the
// publication rule cannot be satisfied by anyone asserting that a link
// works.
//
// Usage:
//   DATABASE_URL=postgres://user@host:port/db node scripts/check-links.mjs
//   DATABASE_URL=... node scripts/check-links.mjs --dry-run
//
// Exit codes: 0 every link reachable, 1 one or more unreachable, 2 could
// not run at all.
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const dryRun = process.argv.includes("--dry-run");

if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

function psql(sql) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-tAq", databaseUrl, "-c", sql], {
    encoding: "utf8",
  }).trim();
}

let rows;

try {
  rows = psql(
    `select id || E'\\t' || source_url from public.content_items
     where status in ('draft', 'pending', 'published') order by created_at`,
  );
} catch (error) {
  console.error("Could not read the catalogue.");
  console.error(error.stderr ?? error.message);
  process.exit(2);
}

const cards = rows
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [id, url] = line.split("\t");
    return { id, url };
  });

if (cards.length === 0) {
  console.log("No cards to check.");
  process.exit(0);
}

console.log(`Checking ${cards.length} source links\n`);

let unreachable = 0;

for (const card of cards) {
  let ok = false;
  let detail = "";

  try {
    // A HEAD request first; some sites refuse it, so fall back to a GET
    // that is abandoned as soon as the status line arrives.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response = await fetch(card.url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "VSHARES link checker" },
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(card.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "VSHARES link checker" },
      });
    }

    clearTimeout(timeout);
    ok = response.ok;
    detail = String(response.status);
  } catch (error) {
    detail = error instanceof Error ? error.message.slice(0, 60) : "failed";
  }

  if (!ok) {
    unreachable += 1;
  }

  console.log(`  ${ok ? "OK  " : "FAIL"}  ${detail.padEnd(8)}  ${card.url}`);

  if (!dryRun) {
    psql(`select public.record_link_check('${card.id}'::uuid, ${ok ? "true" : "false"})`);
  }
}

console.log(
  `\n${cards.length - unreachable}/${cards.length} reachable` +
    (dryRun ? " (dry run: nothing recorded)" : ""),
);

process.exit(unreachable > 0 ? 1 : 0);
