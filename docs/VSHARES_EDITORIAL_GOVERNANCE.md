# VSHARES — Editorial Governance, Identity & Audit

- **Phase:** 10.9 · **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **Status:** designed, built and **database-tested locally**. **Not applied to any
  remote database. Not activated in any UI. No content published.**

This document is the governance design for authenticated human editorial
decisions: who may decide, how a second independent review is enforced, and how
the decision history is kept tamper-evident. It covers the trust boundaries, the
reviewer-identity model, the independent-review rule, the append-only ledger and
its honest limitations, and the owner-controlled activation procedure.

The code it describes:
- Migration `supabase/migrations/20261119120000_editorial_governance.sql` (additive).
- DB test `supabase/tests/cases/280_editorial_governance.sql` (12 assertions).
- Server action `content.recordEditorialDecision` (`src/modules/content/admin-actions.ts`).
- Repository calls in `src/modules/content/repository.ts`.
- Workbench relabelling in `src/components/editorial/editorial-workbench.tsx`.

---

## 1. Security review & trust boundaries

**The database is the security boundary** (CLAUDE.md). Every rule below is
enforced in PostgreSQL, not only in the application, so a bug or a bypass above
the database cannot forge a decision.

| Boundary | Who is trusted | Enforced by |
|---|---|---|
| Who may record a decision | an authenticated moderator/admin | action pipeline `access: "moderator"` **and** `app.is_staff()` inside `record_editorial_decision` |
| Who the reviewer *is* | the server, from the session | `app.current_user_id()` in the function — never a parameter, never a typed name |
| When a decision happened | the server clock | `now()` in the function — never a client value |
| Whether something may publish | the server, from recorded approvals | `editorial_publication_eligible()` / the function's own quorum computation — never a client flag |
| Whether a row can change after the fact | no one, through the app | no UPDATE/DELETE policy or grant, plus an append-only trigger |
| Who may read the ledger | staff only | RLS `editorial_decisions_select_staff` (`app.is_staff()`) |

**What is explicitly *not* trusted:** the browser, the typed reviewer name in the
prototype workbench, any client-supplied timestamp, any client-supplied
eligibility, and the generating agent (which is not a reviewer and has no
account). Publication is **not** part of this system: recording a decision never
publishes. Publication remains the separate, explicit `moderate_content` step.

**Threats considered**

- *Impersonation / self-attribution.* A client cannot name the reviewer; identity
  is read from the authenticated session server-side. Tested: a non-staff account
  is refused.
- *Single-reviewer capture of high-impact content.* Two **distinct** authenticated
  reviewers are required; the same account cannot supply both approvals. Tested.
- *Approving a different thing than was reviewed.* A decision binds to one
  immutable `content_versions` row; the function rejects a revision that does not
  belong to the content. Tested.
- *Silent edit of history.* The table is append-only (trigger + no write policy);
  a hash chain makes any out-of-band edit detectable. Tested (including a forced,
  superuser-level tamper that the chain then reports as invalid).
- *Direct client write.* No INSERT policy/grant; only the SECURITY DEFINER
  function writes. Tested.

---

## 2. Authenticated reviewer identity

A decision's reviewer is **always** the authenticated account that called the
server, taken from `app.current_user_id()` inside `record_editorial_decision`.

- The function refuses if the caller is not an authenticated staff member
  (`app.is_staff()`), so an anonymous or ordinary account cannot record anything.
- `reviewer_id` is set by the function, not accepted as an argument. There is no
  code path that lets a caller choose a different reviewer.
- The prototype workbench's free-text "reviewer name" is a **simulation input
  only**. It is now labelled as such and is never sent to the authenticated path.
  When the authenticated path is activated, the identity comes from the signed-in
  moderator, and the typed field disappears.
- The generating agent has no account and cannot authenticate, so it can never be
  a reviewer. The workbench additionally refuses agent-like names in its local
  simulation (defence in depth, not the real control).

---

## 3. Independent second review

High-impact content requires **two distinct authorised reviewers** to approve the
**same current revision** before it is eligible for publication.

- `content_items.is_high_impact` sets the required approver count: 2 for
  high-impact, 1 otherwise.
- The function counts **distinct** `reviewer_id`s that approved the current
  revision. The same account approving twice is refused outright ("this reviewer
  has already approved this revision"), so it cannot satisfy both.
- Eligibility is bound to an **immutable revision**. When a substantive change is
  made, a new `content_versions` row becomes the content's current version;
  because the new revision has no approvals, `editorial_publication_eligible()`
  returns false again automatically. Prior approvals never silently carry over to
  edited content. Tested: approve v1 of a high-impact card with two reviewers →
  eligible; publish a new v2 → not eligible.
- `escalate` is available as an explicit "needs an independent second review"
  decision for the workflow, distinct from `approve`.

---

## 4. Append-only decision ledger & its limits

Each decision row records: the content id, the **immutable** `content_version_id`,
the **server-set** `reviewer_id`, the `decision` (approve / request_revision /
reject / escalate), the `rationale`, an optional `evidence_ref`, the
`previous_decision_id` (the chain link), the server-computed `publication_eligible`
at decision time, a `row_hash`, a monotonic `seq`, and the server `decided_at`.

**Append-only.** There is no UPDATE or DELETE policy or grant, and a
`before update or delete` trigger raises unconditionally. Through the application
the ledger can only grow.

**Tamper-evidence (hash chain).** Each row's `row_hash` is
`sha256(previous_hash || canonical fields of this row)`. `editorial_ledger_valid()`
recomputes the chain for a content item and returns false if any row was altered
or removed, because every later hash depends on it. The chain is ordered by the
monotonic `seq`, not by the timestamp (several decisions in one transaction share
`now()`) and not by the random `id`.

**Honest limitations — this is tamper-*evident*, not tamper-*proof*:**

1. **A database superuser (or the table owner) can still rewrite history.** They
   can disable the trigger, edit rows, and — because they also know the hashing
   recipe — recompute a *consistent* chain, which `editorial_ledger_valid()` would
   then accept. The hash chain detects casual or application-level tampering and
   accidental corruption; it does **not** defend against a determined privileged
   operator. The DB test demonstrates detection by forcing exactly such a mutation
   (and *not* recomputing the chain), after which validation fails.
2. **No external anchoring.** The chain lives in the same database it protects.
   There is no notarisation to an append-only store outside the DB, no signing key
   held off the database, and no periodic external digest. Those are the real
   defences against a privileged insider and are deliberately **out of scope** for
   this phase.
3. **No cross-content global chain.** Each content item has its own chain, so the
   *relative order of decisions across different content* is not cryptographically
   fixed (only `seq` and `decided_at` order them).
4. **Deletion cascade.** Deleting a `content_items` row cascades to its decisions;
   the ledger is only as durable as the content it refers to. (Content deletion is
   itself a privileged, audited operation.)

**Privileged-admin risk, stated plainly:** anyone with direct database
credentials or the service role is outside this control. The mitigations are
operational, not cryptographic: least privilege (no human holds the service role
routinely), no write grant to `authenticated`, access logging at the platform
level, and — if stronger guarantees are ever required — external anchoring per
limitation 2. This phase does not weaken any existing RLS to achieve the above.

---

## 5. Data model (additive migration)

`editorial_decisions` is a new table; nothing existing is altered or dropped.
`content_versions` and `content_items.is_high_impact` already exist and are
reused for the immutable revision binding and the high-impact flag. RLS is
least-privilege: staff may `select`; no one may write through a policy; writes go
only through `record_editorial_decision` (SECURITY DEFINER, `set search_path = ''`,
schema-qualified). Indexes cover content, version and reviewer lookups.

**Local testing only. The migration is NOT applied to any remote project by this
phase.** It was verified by `npm run test:db` (fresh scratch database, all
migrations, 28/28 case files, 469 assertions, 0 failed).

---

## 6. Owner-controlled activation procedure

Nothing below happens automatically. Each step is an explicit owner decision.

1. **Review** this document, the migration and the DB test on the branch.
2. **Apply the migration to the dev project** (`apgchptregdpswiwmyua`) only when
   you choose to, exactly as migration 9 was applied — through the Supabase
   migration flow, after confirming the local migration history matches. Verify
   the remote migration list then includes `20261119120000_editorial_governance`.
   *(The agent does not run this; no remote push is authorised.)*
3. **Grant staff roles** to the specific human reviewers who should decide
   (moderator/admin), and confirm there are at least **two** distinct reviewers
   for any high-impact content.
4. **Activate the authenticated path in the workbench** (a later, separate change):
   replace the simulated decision form on `/admin/editorial` with a form that
   calls `content.recordEditorialDecision`, showing the signed-in reviewer's
   identity instead of a typed name. Keep `/dev/editorial` as the unauthenticated
   preview.
5. **Keep publication separate.** Eligibility (`editorial_publication_eligible`)
   is a signal for reviewers; publishing a card still goes through the existing
   `moderate_content` path and the Originals publication procedure. Approval in
   the ledger does **not** publish.
6. **Promote to production** only after the dev project is exercised and the owner
   is satisfied — on the same owner-gated terms as every other migration.

**Rollback:** the migration is additive; if it must be undone before anything
depends on it, drop the `editorial_decisions` table and its three functions. No
existing data is modified by applying it.

---

## 7. Verification summary

See the Phase 10.9 report for exact command output. In brief: typecheck, lint and
the editorial unit tests pass; `npm run test:db` passes with the 12 new governance
assertions (staff-only recording, non-staff refused, append-only UPDATE/DELETE,
revision binding, duplicate-approval refusal, single- vs two-reviewer
eligibility, revision invalidation, hash-chain validity, forced-tamper detection,
direct-insert refusal).
