# VSHARES Originals — batch 2 evidence recovery (Phase 10.13 T4b)

- **Date:** 2026-11-21 · **Status:** verification method improved; evidence
  re-assessed on real sources. **Nothing is approved, verified-as-fact, or
  publishable.** No database was written.
- Live retrieval ran read-only through the approved proxy (`FACTORY_LIVE=1`),
  robots.txt respected. Updated packs: `docs/samples/originals-batch-2-review-packs.json`.

## 1. What changed in verification (the core of T4b)

The old method (`verifyClaims`) was binary token-overlap at 0.6 with crude
negation handling — it risked reading textual similarity as truth. T4b adds a
new, **additive** classifier (`src/factory/live/verify-support.ts`,
`classifyClaimSupport`) that leaves `verifyClaims` untouched and gives the review
packs a five-way, honest picture:

| Class | Meaning |
|---|---|
| `exact_support` | verbatim quote, or very high raw-token overlap with matching numbers/dates |
| `semantic_support` | matches only after light lemmatisation — a likely accurate paraphrase (heuristic, flagged) |
| `partial_support` | on-topic, or a number/date the passage does not confirm — a human must check |
| `contradiction` | negation polarity mismatch, or a conflicting number/date, at meaningful overlap |
| `insufficient_evidence` | nothing overlaps the claim enough to say anything |

Guarantees: it carries the **traceable passage**, reports raw and lemmatised
overlap, flags numeric/date/negation issues, and **never confers approval**
(`confersApproval` is always `false`; `textualOnly` always `true`). It explicitly
does **not** equate similarity with fact.

Regression tests (`tests/unit/factory/verify-support.test.ts`, 11) pin: accurate
paraphrase → semantic; on-topic-but-wrong → partial (not truth); negation →
contradiction; conflicting number → contradiction; conflicting date →
contradiction; unconfirmed number → capped at partial (never exact); unsupported
conclusion → insufficient; and that approval is never conferred.

## 2. Evidence re-assessment on real sources (honest results, 2026-11-21)

Re-running the live pipeline with the improved classifier over all 20 candidates
(40 claims):

| Measure | Count |
|---|---|
| Sources retrieved cleanly | 11 / 20 (5 HTTP error, 3 robots-disallowed [respected], 1 robots-unavailable) |
| Claims `exact_support` | **1** |
| Claims `semantic_support` | **0** |
| Claims `partial_support` | **1** |
| Claims `contradiction` | **0** |
| Claims `insufficient_evidence` | **38** |
| Candidates with any exact/semantic/partial support | **2** |
| Candidates re-grading to rubric `queue` | **0** |

So even the better, more generous classifier finds **real support for only 2 of 40
claims** (one exact on *writing-a-cv-that-gets-read*, one partial on
*choosing-strong-passphrases*). The rest are genuinely not substantiated by the
retrieved text, or the source was inaccessible.

## 3. Deliverable counts (as requested)

- **Supported by accessible evidence (exact/semantic):** 1 claim (1 candidate).
- **Partially supported:** 1 claim (1 candidate).
- **Unsupported or contradicted:** 38 claims.
- **Awaiting further verification (inaccessible sources):** 9 candidates
  (HTTP/robots) — evidence not yet obtainable without alternative sources.
- **Eligible for human editorial review now:** **0** candidates meet the rubric
  `queue` bar. Two candidates have a toehold of real support and are the best
  starting points for human rewriting.

**No candidate was automatically approved or published.**

## 4. Why no mass rewriting was done

The brief forbids rewriting "unsupported claims merely to satisfy a similarity
threshold," and requires that "candidates must earn their quality scores." The
honest finding is that the batch-2 takeaways, as written, are **not grounded in
their cited sources** — so rewriting them to pass would be reverse-engineering the
metric, not editorial work. Genuine recovery needs a human to either (a) rewrite
each takeaway to state what a reputable source actually says (grounded in a real
passage), or (b) choose better-matched sources. The improved classifier now makes
that human work faster and safer: it shows, per claim, exactly where real support
exists and where a number/date/negation is the problem.

## 5. Recommendation: NOT yet ready for T6/T7

- **Do not** proceed to T6 (workbench wiring) or T7 (authenticated Playwright)
  expecting batch-2 content, because **0 candidates are review-eligible** and none
  is persisted. Wiring the workbench to batch-2 now would surface only rejected,
  unsupported drafts.
- **Recommended next pass (T4c, human-led):** an editor rewrites takeaways against
  the real retrieved passages (using the per-claim support classes) and replaces
  the 9 inaccessible sources with accessible reputable alternatives; re-run the
  factory; only then do candidates earn a `queue` score honestly.
- **Alternatively**, T6/T7 can proceed on infrastructure grounds using **batch-1**
  (the seeded, human-review-ready cards) and treat batch-2 as a pending content
  pipeline — but that is a scope decision for the owner.

The central principle holds: these candidates have not earned approval, and
nothing here pretends otherwise.
