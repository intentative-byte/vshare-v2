# VSHARES — Phase 10.6 report: first Originals collection & media readiness

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- Prepared the first ten evidence-backed Originals and legitimate multimedia
  relationships. **No remote write, no publication, no automatic approval, no RLS
  weakening, no secret.**

## Task 1 — baseline (DB evidence)
Fresh-DB apply of all 9 migrations + seeds: **10 cards, all draft, 0 published, 0
link-checked, 0 content_media.** The reported zero-published-card condition is
**confirmed by actual database evidence.**

## Task 2 — ten Originals
`docs/VSHARES_ORIGINALS_BATCH_1.md` — ten diverse cards (Personal Finance,
Cybersecurity, Health, AI, Careers, Communication, Learning/maths, Science,
Personal development, Programming). **Six reuse and improve the existing seed
drafts** (hook + evidence check + review requirement added); **four are new**,
each a genuine parent for a candidate video. Each card has a hook, objective,
explanation, claims, source link, takeaway, category/difficulty, quality
assessment and freshness requirement.

## Task 3 — real evidence
`docs/samples/originals-evidence.json` — **real** robots-aware retrieval of all
ten sources (rate-limited):
- **8/10 retrieved with passages**; **MoneyHelper robots-disallowed** (respected,
  marked BLOCKED); **NHS and Khan are JS-rendered** (live but 0 extractable text).
- **1 claim genuinely verified** against a retrieved NASA passage; the rest are
  honestly "unsupported" by the conservative matcher (need human grounding), not
  asserted as fact.
- Provenance (status, passage counts) and every limitation recorded. **No quote,
  citation or verification fabricated.**

## Task 4 — multimedia relationships
Every one of the five candidate videos maps to a legitimate parent Original (same
topic): neural-network → #4, calculus → #7, black holes → #8, grit → #9 (which
carries the balancing evidence), Python → #10. **No video attached to an
unrelated card.**

## Task 5 — editorial review inventory (in the batch doc)
- **Ready for human approval:** 7 (2,4,5,6,8,9,10). **Revision required:** 3
  (1 budget — robots-blocked source; 3 sleep — JS page; 7 calculus — JS page).
  **Blocked outright:** none.
- **High-impact (independent second reviewer required):** budget, sleep — **not
  self-approved.**
- **Source-link status:** 8/10 live; 1 robots-blocked; NHS/Khan JS-rendered.
- "Ready" means the agent found no blocker; a human still confirms content and,
  for high-impact, a second reviewer approves. No auto-approval.

## Task 6 — activation readiness
`docs/VSHARES_ORIGINALS_PUBLICATION_PROCEDURE.md` — development-only, owner-run:
publish the **parent card first** (link check + moderation; high-impact second
reviewer), verify RLS, then publish the **hosted media** (server-write-only,
published parent required), verify, with editorial gates, failure handling and
rollback. **Not executed.**

## Task 7 — verification (exact)
| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 306 passed, 4 skipped** (live tests) |
| `npm run test:db` | **PASS — 27 files, 457 assertions, 0 failed** |
| `npm run test:e2e` | **PASS — 92 passed / 72 skipped / 0 failed** |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 374 tracked files** |

## Remaining blockers
1. 3 cards need revision (crawlable finance source; manual NHS/Khan verification).
2. Claim grounding is conservative — a human confirms claims before approval.
3. No card published yet → media cannot be shown until a parent card is published.

## Next recommended step
Human review of the 7 ready cards; fix the 3 revision cards; then run the
publication procedure in development (card → hosted video), owner-authorised.

**Success criterion met:** ten evidence-backed Originals prepared for editorial
review, with legitimate multimedia relationships for all five videos and a clear,
safe development publication path. **STOP for owner review.**
