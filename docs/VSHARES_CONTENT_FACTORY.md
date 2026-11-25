# VSHARES — Content Universe Architecture & Factory Blueprint

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567` · **Commit:** `3733f79`
- **Scope:** documentation and planning only. No migration, no remote write, no
  card published, no change to VAI admission or RLS. Everything here maps onto
  the **existing** schema; new structures are called out as *proposed future
  migrations*, not applied.
- **Promise:** "Stop doomscrolling. Start value scrolling." The factory exists
  to produce genuinely useful knowledge, not low-quality AI content at volume.
- **Companion docs:** `VSHARES_CONTENT_TAXONOMY.md` (the 20-category universe and
  the 100-card pilot curriculum), `VSHARES_ARCHITECTURE.md` §6 (ranker),
  `VSHARES_DATA_MODEL.md`, `VSHARES_SECURITY.md`.

---

## Task 1 — Audit of the existing content system (what to reuse)

The catalogue already has a complete, governed spine. **Reuse all of it.**

### Schema (migration `20261114140000_catalogue.sql`) — reuse as-is
- **`content_items`** — identity + lifecycle. Columns worth naming:
  `slug` (8–90, kebab, unique), `kind` (`external_resource` default; `lesson`
  reserved for original content), `origin` (`curated|user_submitted|creator|ingested`),
  `status` (`draft|pending|published|rejected|archived`), `primary_topic_id`,
  `current_version_id`, `format` (`article|video|podcast|course|tool|book`),
  `level` (`beginner|intermediate|advanced`), `estimated_minutes` (1–600),
  **`quality_score`** (0–100, editorial, "replaced by an outcome-derived score
  when there is enough data"), **`source_url`** (`https://…`, **unique → dedup
  across the catalogue**), `is_ai_assisted`, `is_high_impact`, `submitted_by`,
  `reviewed_by/at`, `published_at`, `rejection_reason`, **`link_checked_at`**.
- **`content_versions`** — versioned copy: `title` (10–120), `summary` (40–600),
  `takeaways[]` (1–3), `next_step` (10–300), `source_name`, `source_author`,
  `version_no`. Corrections add a version; the original is kept.
- **Admission gates enforced in the database (the security boundary):**
  - `content_published_needs_review` — published ⇒ `reviewed_at`,
    `published_at`, `current_version_id` all present.
  - `content_published_needs_link_check` — published ⇒ `link_checked_at` set,
    written only by a real request in `scripts/check-links.mjs` (writing it by
    hand is falsifying it).
  - `content_rejected_needs_reason` — rejected ⇒ a reason.
  - **`source_url` UNIQUE** — the catalogue cannot hold two cards for the same
    link; this is the primitive duplicate detection sits on.
- **Supporting tables:** `content_reports` (`report_reason`:
  `broken_link|inaccurate|harmful|spam|copyright|other`), moderation events
  (`moderation_action`: `submit|approve|reject|edit|archive|restore|resolve_report`),
  the audit log, and `topics`/`categories` (both carry `is_high_impact`).

### Functions / workflow — reuse as-is
- `create_card` (role-checked, writes a draft + first version + audit),
  `add_card_version`, `record_link_check` (sets `link_checked_at`),
  `moderate_content` (`approve|reject|…`) which **refuses to publish an
  unchecked link and refuses high-impact content approved by its own submitter
  (second-reviewer rule)**.
- Admin surface: `/admin/taxonomy`, `/admin/cards/*`, `/admin/audit`.
- **VAI discovery engine** (`src/modules/vai`): deterministic weighted ranker —
  `quality`, `levelFit`, `engagementQuality`, `freshness`, optional `formatFit`;
  penalties `impressionPenalty` (capped) and `sameSourcePenalty`; a reserved
  `discoveryPosition` slot; config versioned in `ranking_configs` (v2 active).

### What is missing (gaps the factory must fill) — *proposed, not applied*
| Gap | Why it matters at scale | Proposed home |
|---|---|---|
| Structured **evidence record** per card (research notes, citations, fact-check results, grader scores) | Today `quality_score` is a single editorial integer; at 2,000+ cards reviewers need the evidence behind it | New table `content_evidence` (future migration), or a JSON column on the draft version; **never overwrites** the DB gates |
| **Freshness / review-due** scheduling | 10,000 maintained cards need re-check dates, not just `link_checked_at` | `review_due_at` column + a monitor job (future migration) |
| **Duplicate detection beyond exact URL** | Same content at different URLs, or near-duplicate summaries | A normalized-URL + title-similarity check in the factory (application layer), feeding the existing `source_url` unique gate |
| **Curriculum coverage model** | Knowing which topics/levels are under-served | A planning view over `topics` × `level` × published counts (read-only) |
| Batch **provenance / AI-assist labelling** | Honesty + auditability of agent-produced drafts | Reuse `is_ai_assisted`; add agent run id to evidence |

**Nothing in the audit requires changing an existing migration or gate.** The
factory sits *in front of* `create_card` and the moderation workflow; the DB
remains the final admission authority.

---

## Task 3 — The Content Factory (modular agent system)

A pipeline of specialised agents, each emitting **structured, inspectable
evidence**. Agents draft and grade; **humans approve**. No agent can set
`status = published` — only `moderate_content` run by a human moderator can, and
only through the DB gates.

| # | Agent | Input | Output (structured evidence) | Hard rule |
|---|---|---|---|---|
| 1 | **Curriculum Planner** | taxonomy, published-coverage view, targets | a prioritised list of `{topic, level, format, rationale}` gaps | plans gaps only; never invents topics outside the taxonomy |
| 2 | **Research Agent** | one planned slot | candidate sources `{url, publisher, date, why}` | returns only URLs it actually retrieved; **never fabricates a citation** |
| 3 | **Source Verification Agent** | candidate URLs | `{url, http_status, final_url, publisher_identity, is_reputable, last_updated}` | a source that 404s / redirects to spam / lacks a verifiable publisher is rejected |
| 4 | **Educational Content Writer** | one verified source | a draft version: `title, summary, takeaways[1-3], next_step` in VSHARES voice | summary is *our words about the source*, not copied text; respects field limits |
| 5 | **Fact-Checking Agent** | draft + source | per-claim `{claim, supported_by_quote, source_location, verdict}` | every takeaway must trace to a quote in the source; unsupported ⇒ reject |
| 6 | **Duplicate Detection Agent** | draft + catalogue | `{exact_url_match, normalized_url_match, nearest_title_similarity}` | exact/normalized URL already present ⇒ reject (mirrors the DB unique gate) |
| 7 | **Learning Quality Grader** | draft + evidence | the 8-axis rubric scores (Task 4) with per-axis justification | scores are computed from evidence, never asserted; writes `quality_score` proposal |
| 8 | **Safety & High-Impact Reviewer** | draft + topic flags | `{is_high_impact, risk_notes, requires_second_reviewer, disclaimers}` | high-impact (finance/health/legal/safety) ⇒ flags for independent human review; adds "educational, not advice" |
| 9 | **Editorial Queue Manager** | graded+flagged drafts | an ordered human queue with evidence bundles, SLATE: Source, Links, Accuracy, Takeaways, Edge-cases | routes high-impact to a *different* reviewer than any agent/human author |
| 10 | **Content Freshness Monitor** | published cards | `{link_status, source_last_updated, review_due}` → re-check / retire tickets | a failed link check moves a card out of `published` for re-review |

**Evidence contract (all agents):** every output is a JSON record with the
source URL(s), retrieval timestamps, quotes supporting each claim, the agent/run
id, and a confidence. An agent that cannot produce evidence returns `insufficient
evidence`, never a guess. Evidence is stored (proposed `content_evidence`) and
shown to the human reviewer. **No citation is ever invented.**

---

## Task 4 — Quality scoring rubric (transparent, 8 axes)

Each axis 0–5, with written justification from evidence. The composite maps to
the DB `quality_score` (0–100). **A high score never bypasses human approval or
any DB gate.**

| Axis | 0–5 means | Evidence it is computed from | Hard floor |
|---|---|---|---|
| Factual accuracy | every claim supported by the source | Fact-Checking Agent per-claim verdicts | any unsupported claim ⇒ **reject** |
| Source reliability | reputable, identifiable publisher | Source Verification identity + domain class | unverifiable publisher ⇒ **reject** |
| Educational usefulness | teaches something actionable | takeaways + next_step quality | no genuine takeaway ⇒ reject |
| Clarity & readability | plain, within field limits, one idea per takeaway | writer self-check + reading-level | below 3 ⇒ revise |
| Practical application | a real next step the reader can do | `next_step` concreteness | generic/again-read ⇒ revise |
| Originality / non-duplication | distinct from the catalogue | Duplicate Detection | exact/normalized dup ⇒ **reject** |
| Safety | no harmful, misleading or high-risk advice | Safety Reviewer | harmful ⇒ **reject**; high-impact ⇒ escalate |
| Freshness | source current; re-check scheduled | source last-updated + link check | stale critical source ⇒ revise/retire |

**Composite:** `quality_score = round( 20 × mean(axes) )`, clamped 0–100, but
gated by the floors above (a floor breach forces reject/revise regardless of the
mean). **Rejection thresholds:** composite < 60 ⇒ reject; 60–74 ⇒ revise-and-
resubmit; ≥ 75 ⇒ eligible for the editorial queue. **Escalation:** any
high-impact flag, any safety score < 4, or any reviewer disagreement ⇒ a second
independent human reviewer (enforced for high-impact by the DB second-reviewer
rule). The score is advisory to humans; it is **never** an auto-publish trigger.

---

## Task 5 — Content lifecycle, mapped to the schema

```
RESEARCH → DRAFT → VERIFY → GRADE → EDITORIAL REVIEW → APPROVAL → PUBLISH → MONITOR → REFRESH / RETIRE
```

| Stage | Who | Schema effect | Gate preserved |
|---|---|---|---|
| RESEARCH | Agents 1–3 | evidence only (proposed `content_evidence`) | — |
| DRAFT | Agent 4 → `create_card` | `content_items(status='draft')` + `content_versions` v1; `is_ai_assisted=true` | role-checked create |
| VERIFY | Agents 3,5,6 + `record_link_check` | sets `link_checked_at`; evidence attached | **link check is a real request** |
| GRADE | Agent 7 | proposes `quality_score`; rubric evidence | floors can force reject |
| EDITORIAL REVIEW | human moderator via `/admin/cards` | reads evidence; may `edit` (new version) | human-in-the-loop |
| APPROVAL | human via `moderate_content('approve')` | `reviewed_by/at` set | **unchecked link & high-impact self-approval refused** |
| PUBLISH | `moderate_content` | `status='published'`, `published_at`, `current_version_id` | `content_published_needs_*` constraints |
| MONITOR | Agent 10 | reads link status / reports | a report/broken link can pull it back |
| REFRESH / RETIRE | Agent 10 → human | `add_card_version` (refresh) or `status='archived'` (retire) | versions keep history |

**Necessary future migrations (proposed, not applied):** (a) `content_evidence`
table; (b) `review_due_at` + an index for the freshness monitor; (c) a read-only
coverage view. Each is additive, behind the existing gates, and ships only with
owner approval and its own cross-user RLS test.

---

## Task 7 — Scale planning (100 → 500 → 2,000 → 10,000)

| Milestone | Cards | Editorial workload (human) | Infra / cost drivers | Primary bottleneck | Quality gate before scaling |
|---|---|---|---|---|---|
| Validation | 100 | ~1 editor, ~2–3 wks (incl. link checks) | negligible; agent runs + link checks | editorial review time | ≥95% of published cards pass a spot re-check; Budgeting + 6 others live; 0 broken links |
| Private beta | 500 | 1–2 editors ongoing; ~40–60 cards/wk | agent API cost (drafts+fact-check), link-check jobs | second-reviewer capacity for high-impact | <2% report rate; <1% broken-link rate; coverage across ≥12 categories |
| Wider launch | 2,000 | small editorial pod (2–3) + queue manager | storage trivial; agent cost scales with drafts; monitor jobs | duplicate/near-dup detection accuracy; freshness backlog | duplicate escape rate <1%; median freshness age within policy; rubric inter-reviewer agreement ≥0.8 |
| Long-term | 10,000+ | editorial pod + rotating domain experts | freshness monitoring dominates; re-check cadence | **maintenance**, not creation — stale/dead links | automated freshness SLA met; retire/refresh backlog bounded; per-category owner assigned |

**Cost shape:** creation cost is front-loaded and roughly linear in drafts;
**maintenance cost grows with the library** and dominates past ~2,000. Design the
monitor and review-due scheduling early (the proposed `review_due_at`) so the
10,000 milestone is a maintenance problem, not a crisis. **Measurable quality
gates must pass before each scale step** — volume never overrides the rubric
floors or the DB gates.

---

## Task 8 / Phase 10.2 — proposed implementation sequence (owner-gated)

1. **Coverage view + planner (read-only).** Build the published-coverage view
   and the Curriculum Planner; produce the real gap list. No writes.
2. **Evidence model (proposed migration).** Design `content_evidence` + its RLS
   test; owner approves before applying.
3. **Research + Source Verification agents.** Real retrieval, structured
   evidence, no fabricated citations; dry-run against the 100-card pilot slots.
4. **Writer + Fact-Check + Duplicate agents.** Produce drafts via `create_card`
   (drafts only, `is_ai_assisted=true`), each with evidence; nothing published.
5. **Grader + Safety reviewer + Queue manager.** Rubric scoring + high-impact
   routing into the editorial queue.
6. **Human editorial pass on the pilot.** Link-check (`check:links`), review,
   approve ≥7 incl. Budgeting (second reviewer for high-impact). This is the
   first real publish — **owner-authorised, through the existing gates**.
7. **Freshness monitor (proposed migration).** `review_due_at` + the monitor
   job; wire broken-link → pull-back.
8. **Scale gates + batch 500 planning.** Only after the pilot meets its quality
   gate.

Each step is **proposed**; none is authorised by this document. **STOP for owner
review.**

---

## Restrictions honoured

Documentation and planning only · no remote DB write · no migration applied · no
content published · no weakening of VAI admission or RLS · no deployment or
merge · no automatic authorization for later phases.
