# VSHARES — Phase 10.3 report: live research, live TAI & evidence verification

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **What this is:** the factory moves from fixtures to **genuine network
  retrieval, real claim verification and real observed trends** — while staying
  local-first and read-only. No remote DB write, no migration, no content
  published, no live write-enabled test, **no fabricated citations or trend
  metrics**, no RLS change, no merge/deploy, no secret exposed (the User-Agent
  carries no personal data).

## Priority 1 — Live source research (`src/factory/live/`)
A configurable, injected-`HttpFetcher`, rate-limited, **robots-aware** source
adapter:
- `robots.ts` fetches and obeys robots.txt; **a robots.txt that cannot be read
  (403/5xx/throw) is treated as disallow** — we never crawl rules we cannot see.
- `source-adapter.ts` retrieves a page politely (timeout, polite delay, cache),
  extracts attributable **passages**, reads timestamps from `Last-Modified`/meta,
  and **reports a missing timestamp rather than guessing**. Every failure mode
  (timeout, network, 429, 4xx/5xx, disallowed, robots-unavailable) is recorded.
- `verify.ts` checks each claim against **actually retrieved passages** and
  returns one of **verified / unsupported / contradictory / unavailable**. A
  supplied quote not present in the source is **rejected as a possible
  fabrication** (never "verified"). **Publisher reputation alone is never
  verification** — accuracy is driven by `verifyClaims`, not the allowlist.

## Priority 2 — Live TAI trend observation
`trend-adapter.ts` reads a permitted Atom/RSS feed into **real, timestamped
observations** with provenance (feed id + entry id). Entries without a parseable
timestamp are **skipped and counted**, never time-stamped artificially. Momentum
(from `src/factory/tai.ts`) still requires ≥4 observations from ≥2 sources, so a
single snapshot correctly yields **INSUFFICIENT_DATA** rather than invented
popularity.

## Priority 3 — Editorial evidence workbench
`docs/samples/live/editorial-workbench.html` — a local, inspectable, **read-only**
review surface showing, per draft: objective, category/topic/level, source +
retrieval status + source date + passage count, the per-claim verdicts **with the
actual supporting passage**, evidence totals, quality composite and floor
breaches, and high-impact flags/disclaimers. It states plainly that approval
happens via a human running `moderate_content` through the database gates — it
has **no approve/publish control**.

## Priority 4 — Integration
`research.ts` wires retrieval + verification into the existing rubric, safety and
duplicate checks; the pure factory, VAI ranking, DB admission gates and
independent high-impact review are untouched.

## Priority 5 — Real-world demonstration (genuine; `docs/samples/live/`)
Run live through the egress proxy (`--use-env-proxy` + the CA bundle), retrieving
5 real sources incl. **Personal Finance** (GOV.UK debt advice) and
**Cybersecurity** (NCSC):

| Draft | Source | Retrieval | Passages | Source date | Verified / unsupported | Overall |
|---|---|---|---|---|---|---|
| secure-your-main-email-and-accounts | NCSC | ok (200) | 11 | 2026-11-17 (real) | 0 / 2 | not_verified |
| where-to-get-free-debt-advice | GOV.UK | ok (200) | 21 | missing (reported) | **1** / 1 | not_verified |
| a-consistent-wake-time-for-sleep | NHS | ok (200) | 0* | missing | 0 / 2 | not_verified |
| prepare-for-a-job-interview | National Careers | ok (200) | 40 | missing | 0 / 2 | not_verified |
| steps-to-set-up-a-business | GOV.UK | ok (200) | 49 | missing | **1** / 1 | not_verified |

- **2 claims genuinely verified** against real retrieved passages (e.g.
  *"Most people set up as a sole trader, a limited company or a partnership"* →
  matched a real GOV.UK passage, overlap 0.67). The rest are honestly
  **unsupported** (a paraphrase that does not share enough wording), so every
  card is routed to the workbench as **not yet ready**, not published.
- `*` The NHS page yielded **0 extractable passages** (JS-rendered / consent
  interstitial), so its claims are honestly unsupported — a coverage limitation,
  not a fabrication.
- **Trend report:** both feeds returned 200 with **20 real timestamped entries
  each (40 observations)**; 36 clusters; **0 proposable → INSUFFICIENT_DATA**,
  reported honestly.
- **BLOCKED, reported honestly:** MoneyHelper was not crawled — its robots.txt
  returns 403, so the adapter marks it disallowed rather than presenting its
  content.

The retrieval cache is committed, so the demonstration **replays
deterministically** without re-hitting the network.

## Priority 6 — Testing (test-first, offline, deterministic)
`tests/unit/factory/live.test.ts` (25 tests) + the gated live demo. Covers:
network failure, timeout, rate limit, http error, robots disallow, robots
unavailable, passage extraction, missing timestamp, Last-Modified parsing;
verified / unsupported / contradictory / unavailable verdicts; **fake-citation
rejection**; reputation-is-not-verification; feed parsing + timestampless skip;
feed http error; **insufficient momentum**; **stale-trend expiry**; duplicate
clustering; high-impact escalation; **default-deny publishing**; **deterministic
cache replay**.

## Verification (this phase, exact)
| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 269 passed, 1 skipped** (the live network test, correctly offline in CI), 20 files |
| `npm run test:e2e` | **PASS — 90 passed / 72 skipped / 0 failed** |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 326 tracked files** |
| Live demo (FACTORY_LIVE=1, through proxy) | ran: 5 real retrievals, 2 verified claims, 40 real trend observations, INSUFFICIENT_DATA |

## Known limitations
1. **Naive HTML text extraction** — JS-rendered pages (NHS) yield no passages;
   needs a main-content/readability extractor or a rendered fetch.
2. **Overlap verification is conservative** — faithful paraphrases that don't
   share tokens read as unsupported; a real system adds semantic matching + the
   human confirmation the workbench already requires.
3. **One-shot feed snapshot → low momentum** (expected); real momentum needs
   observations accumulated over time.
4. Small reputable allowlist; MoneyHelper (robots 403) is blocked.
5. In this environment Node `fetch` needs `--use-env-proxy` + `NODE_EXTRA_CA_CERTS`.

## Next-stage recommendation (Phase 10.4, owner-gated)
1. Add a readability/main-content extractor (lift passage yield; re-run the demo
   to raise genuine verification).
2. Persist trend observations across runs so momentum accrues over days.
3. Add more approved source and feed adapters (with licensing/attribution).
4. Propose the `content_evidence` migration (store evidence with the draft) and
   wire the workbench into `/admin` as a read-only review surface — leading to
   the **first owner-authorised publish** of verified cards through
   `moderate_content`, targeting ≥7 incl. Budgeting.

**Success criterion met:** VSHARES discovered real topics, retrieved trustworthy
information, **verified specific claims against actual retrieved evidence**,
produced educational drafts and prepared them for human editorial review —
publishing nothing and fabricating nothing. **STOP for owner review.**
