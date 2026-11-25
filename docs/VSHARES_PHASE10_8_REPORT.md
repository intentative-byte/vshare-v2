# VSHARES — Phase 10.8 report: Editorial Review Workbench

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- A working, reviewer-only Editorial Review Workbench that makes evidence,
  corrections, second-review requirements and publication blockers visible —
  **with every live publication control kept closed.** No remote write, no
  publication, no automatic approval, no RLS weakening, no secret.

## Task 1 — baseline / reuse
Reuses the existing admin area and its **server-side staff gate** (the admin
layout denies anyone without a moderator/admin role, `notFound`), the content
status model, the evidence records (`docs/VSHARES_ORIGINALS_REVIEW_PACK.md`,
`docs/samples/originals-evidence.json`) and the moderation/publication gates. **No
parallel publication system** — the workbench only inspects and records local
decisions; publishing still goes through `moderate_content` and `content_media`.

## Task 2 — editorial dashboard
`src/components/editorial/editorial-workbench.tsx` shows the ten Originals with:
status badge (READY / REVISION / EVIDENCE BLOCKED), **content state** (draft /
reviewed / approved / published — all ten are **draft**), high-impact flag, a
qualitative **evidence indicator**, related multimedia, and publication blockers.

## Task 3 — claim review
Each claim is shown with its exact supporting evidence, source identity and
authority, **direct vs indirect** support, contradictory/qualifying evidence,
verification date and concerns. The evidence indicator (`strong` / `moderate` /
`limited`) is **computed from the recorded fields** — not a fabricated confidence
score (a blocked source or an unsupported claim forces `limited`).

## Task 4 — human decision workflow
Approve · Request revision · Reject · Escalate for independent second review. Each
decision requires a **reviewer name** and a **rationale**, and records the time.
Persistence is **local only** (`localStorage`) — a labelled prototype that
**never writes to the database and never publishes.**

## Task 5 — security & governance
- **Reviewer-only, server-side:** `/admin/editorial` is wrapped by the admin
  layout's staff check (non-staff → `notFound`; 404 with no DB configured). E2E
  asserts `/admin/editorial` and the dev preview `/dev/editorial` both answer
  **404** to an unauthorised/unconfigured request.
- **Agent is not a reviewer:** `validateDecision` refuses a reviewer name matching
  the agent (`claude`, `ai`, `bot`, `automated`, …) and **blocks approving
  high-impact content without an independent second review** (unit-tested).
- Existing RLS, moderation and publication gates are untouched.

## Task 6 — multimedia review
Each candidate video shows identity, creator, embed status (**verified-metadata**,
i.e. oEmbed only) and parent-card relationship, and is explicitly marked **"NOT
fact-checked — a human must watch it."** oEmbed success is never shown as content
verification.

## Task 7 — tests (exact)
| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 319 passed, 4 skipped** (gated live tests), incl. 13 editorial unit tests (agent-cannot-review, high-impact gate, evidence indicator, data integrity) |
| `npm run test:db` | **PASS — 27 files, 457 assertions, 0 failed** |
| `npm run test:e2e` | **PASS — 94 passed / 72 skipped / 0 failed** (incl. editorial access-denial 404s) |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 380 tracked files** |
| Workbench accessibility (axe, dev build) | **0 violations** on `/dev/editorial` at 412px and 1280px |

Covers: unauthorised-access denial, reviewer-only access (server-side gate),
evidence visibility, decision validation, independent-review requirement, no
accidental publication (local-only, `content_state` stays draft), no remote
writes, accessibility and mobile usability.

## Task 8 — delivery & preview
- **Screenshot:** `docs/samples/editorial-workbench.png`.
- **Reproducible preview (no auth) — accessibility/dev:**
  ```bash
  npm run build
  DEV_TOOLS_ENABLED=true npx next start -p 3110
  # open http://127.0.0.1:3110/dev/editorial
  ```
- **Real reviewer surface:** configure a database, sign in as a moderator/admin,
  then open `/admin/editorial` (non-staff get a 404).

## Remaining limitations
1. **Decisions are local only** (localStorage), by design — no server persistence
   yet (no remote write authorised).
2. The dev preview is open to anyone with dev tools on; the authoritative,
   staff-gated surface is `/admin/editorial`.
3. Evidence quality is qualitative; it summarises the recorded fields, not a
   model-scored confidence.

## Roadmap — later controlled persistence (owner-gated)
1. Additive `editorial_decisions` (and/or `content_evidence`) migration with RLS
   (staff-write-only, audit-logged) — reviewed like migration 9, applied only on
   owner approval.
2. Wire the decision workflow through an authorised server action
   (`defineAction`, `access: "moderator"`), so decisions persist server-side under
   the existing action pipeline (rate-limit → authenticate → authorise → record).
3. Link an "approve" decision to the real `moderate_content` publish path (card
   then hosted media) via the Originals publication procedure.

**Success criterion met:** a functioning human editorial review interface that
surfaces evidence, corrections, independent-review requirements and publication
blockers, while keeping all live publication controls closed. **STOP for owner
review.**
