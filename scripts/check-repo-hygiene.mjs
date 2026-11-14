// Repository hygiene guard. VSHARES is an independent project: this check
// fails if files or dependencies from unrelated projects or disallowed
// platforms appear in the tracked tree. See docs/VSHARES_DECISIONS.md
// (D-025, D-026).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);

// File types that have no place in this application.
const forbiddenFile = /\.(py|ipynb|pem|key|p12|pfx)$|(^|\/)\.env(\.(?!example$)[^/]*)?$/i;

// Packages that must never become dependencies: brokerage / trading SDKs
// and Lovable tooling.
const forbiddenPackage = /alpaca|oanda|kraken|ccxt|binance|coinbase|interactive-?brokers|metatrader|lovable|gpt-?engineer/i;

const problems = [];

for (const file of tracked) {
  if (forbiddenFile.test(file)) {
    problems.push(`forbidden file type tracked: ${file}`);
  }
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
  for (const name of Object.keys(pkg[section] ?? {})) {
    if (forbiddenPackage.test(name)) {
      problems.push(`forbidden dependency in ${section}: ${name}`);
    }
    if (/^(latest|\*|x)$/i.test(pkg[section][name]) || /^[\^~><]/.test(pkg[section][name])) {
      problems.push(`dependency not pinned to an exact version: ${name}@${pkg[section][name]}`);
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`FAIL: ${problem}`);
  }
  process.exit(1);
}

console.log(`Repository hygiene check passed for ${tracked.length} tracked files.`);
