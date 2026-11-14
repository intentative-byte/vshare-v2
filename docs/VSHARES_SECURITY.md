# VSHARES — Security Model

- Version: 1.0 · Date: 2026-11-14
- Standards used as checklists: OWASP ASVS (Level 2 target for the MVP), OWASP Top 10 (2021), UK GDPR / Data Protection Act 2018, PECR for storage and access on devices.
- This document never contains secret values.

## 1. Incident record

### SEC-2026-001 — Third-party API credentials committed to a public repository

| | |
|---|---|
| What | An API key ID and secret for a brokerage (Alpaca, paper-trading endpoint configured) were hardcoded in `DAX_GOLD_PLUS_v7_LEARNING_READY.py`. The owner has confirmed this file belongs to a separate, unrelated trading project and reached this repository by mistake. VSHARES has no connection to any brokerage or trading system. |
| Where | Commit `5db2911` (PR #7, merged 2026-06-27). Present at the tip of `main`. Not present on any other remote branch (all seven checked on 2026-11-14). The PR's source branch no longer exists on the remote. |
| Exposure | The repository is public; the values have been readable by anyone since 2026-06-27 and must be assumed copied. |
| Found | 2026-11-14, during Phase 0 audit. |
| Actions taken | File and its `CLEANUP_NOTES.md` removed from the working tree on the rebuild branch (commit `03ff06d`); notes verified to contain no VSHARES information. Secret scanning added to CI. `.gitignore` extended for key and credential files. |
| Credential status | **Revoked — confirmed by the owner on 2026-11-14.** Not independently verifiable from this environment. |
| Cross-project audit | 2026-11-14: every remote branch searched for brokerage, trading-bot and exchange terms, Python or notebook files, and foreign dependencies or environment variables. The only matches anywhere are the two removed files at the tip of `main`. No shared configuration, imports, dependencies or environment variables exist. |
| Safeguards added | gitleaks over full history in CI; `npm run check:hygiene` in CI (fails on Python/notebook/key/env files, on brokerage or Lovable packages, and on unpinned dependencies); `.gitignore` rules for credential files. |
| Still present | In git history on `main` and in any clone or fork. History has not been rewritten (owner instruction). Until the rebuild branch is merged, the file is also still at the tip of `main`. |
| Scanner note | `.gitleaks.toml` excludes that single historical path so the scanner can fail on anything new. Remove the exclusion if history is ever rewritten. |

### Wider credential audit (2026-11-14)

- Method: exact-match search for the two leaked values across every remote branch; pattern search over the full diff history of all branches for key, token, password, private-key, JWT and common provider-prefix patterns.
- Result: no other credentials found. `SUPABASE_SERVICE_ROLE_KEY` appears only as an empty placeholder (PR #1). `supabase/seed.sql` sets the literal password `password` for two local example users — not a leaked secret, but removed in the rebuild (seed users will be created through the local auth API with random passwords).
- Limitation: a dedicated scanner (gitleaks) could not be run locally in this environment; it runs in CI and its first result should be reviewed when CI first executes.

## 2. Assets and trust boundaries

| Asset | Why it matters |
|---|---|
| User accounts and sessions | Account takeover |
| Personal data: email, profile, interests, learning history | Privacy; interests can be revealing |
| Catalogue integrity | Malicious or misleading links shown to users |
| Admin and moderation powers | Platform-wide impact |
| Service-role key and other secrets | Full database access |
| Analytics | Validation decisions depend on it; privacy |

Boundaries: browser ↔ application (all input untrusted) · application ↔ database (RLS as second layer) · application ↔ third parties (Supabase Auth, Google OAuth, external resource links) · learner ↔ moderator ↔ admin.

## 3. Threats and controls

| # | Threat (OWASP) | Control | Verified by |
|---|---|---|---|
| T1 | Broken access control — reading or changing another user's data (A01) | Server resolves identity; RLS on every table; integrity-critical tables are server-write-only; no client-supplied user IDs | SQL tests with two users per table; integration tests |
| T2 | Privilege escalation to admin (A01) | Roles in `user_roles`, never in user metadata; granted only via audited server function; every admin action re-checks role; `/admin` guarded at layout and action level | Tests: every admin action as learner and as guest → `FORBIDDEN` |
| T3 | Guest abuse — mass anonymous accounts, write flooding (A04) | Guest created only on first write; per-IP limits; CAPTCHA on anonymous sign-in; interaction rate limit; 30-day purge | Rate-limit tests |
| T4 | Session theft, CSRF (A07) | HTTP-only, Secure, SameSite=Lax cookies; server actions' origin check; no tokens in localStorage; sign-out everywhere | Header and cookie assertions in E2E |
| T5 | Open redirect / auth callback abuse (A01) | `next` restricted to same-site relative paths; PKCE; exact redirect allow-list in Supabase | Unit tests incl. `//`, backslash, absolute URLs |
| T6 | Account enumeration (A07) | Identical response for known and unknown emails; rate-limited magic links | Integration test |
| T7 | Injection — SQL, XSS (A03) | Parameterised queries only; Zod validation; React escaping; no `dangerouslySetInnerHTML`; strict CSP with nonces; user text rendered as text | Lint rule; CSP test; XSS payload fixtures |
| T8 | Malicious submitted links — phishing, malware, `javascript:` (A03/A10) | `https` only; public hostnames only; moderation before publication; links open with `rel="noopener noreferrer nofollow ugc"`; report flow; server does not fetch submitted URLs in the MVP (no SSRF surface) | Validation tests; moderation tests |
| T9 | Spam and low-quality submissions (A04) | Registered users only; 5/day; duplicate detection; moderation queue | Rate-limit and duplicate tests |
| T10 | Mass assignment / over-posting (A04) | `.strict()` schemas; partial updates touch only named columns; column-level grants | Tests posting extra fields |
| T11 | Information leakage in errors and logs (A09/A05) | Uniform error envelope; DB errors never returned; logs carry a digest of the account id, never emails, content or input values | **Tested (M6):** 7 unit tests drive the pipeline with an email address, a note and a token on every outcome — success, validation failure, handler failure, exception — and assert that none of those values reaches a written line or a returned envelope. Previously this held by construction only |
| T12 | Secret exposure (A05) | Env-only secrets validated at boot; service key server-only (`server-only` import guard); gitleaks in CI; `.gitignore` | CI secret scan; build test that client bundles contain no service key name |
| T13 | Vulnerable dependencies (A06) | Pinned versions; `npm ci`; audit in CI — zero tolerance in production deps, no high/critical in dev deps | CI audit job |
| T14 | Missing security headers, clickjacking (A05) | CSP, HSTS, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | Header test |
| T15 | Insecure file upload — avatars (A04) | Type and size limits; server-side re-encode; random storage path; no SVG | Upload tests |
| T16 | Insufficient audit trail (A09) | Append-only `audit_log` and `moderation_actions`; update/delete revoked | SQL tests |
| T17 | Data loss | Backups and point-in-time recovery (paid tier — needs approval); restore drill before launch | Runbook; drill recorded in test report |
| T18 | Manipulated ranking or analytics | Completion, save, like, skip recorded server-side; beacon events rate-limited and vocabulary-checked; smoothed engagement score | Tests |
| T19 | Denial of service / cost | Rate limits; pagination caps; body-size limits; no LLM spend in MVP | Tests |

## 4. Authorisation matrix (MVP)

| Capability | Visitor | Guest | User | Moderator | Admin |
|---|---|---|---|---|---|
| Read published catalogue | ✓ | ✓ | ✓ | ✓ | ✓ |
| Complete / save / like / skip | — (becomes guest) | ✓ | ✓ | ✓ | ✓ |
| See own library, progress, preference memory | — | ✓ | ✓ | ✓ | ✓ |
| Submit or report a resource | — | — | ✓ | ✓ | ✓ |
| Edit profile, export, delete account | — | — | ✓ | ✓ | ✓ |
| Moderation queue, reports, edit cards, funnel reports | — | — | — | ✓ | ✓ |
| Taxonomy, roles, flags, ranking config, audit log | — | — | — | — | ✓ |

Full per-table policies are in `VSHARES_DATA_MODEL.md`.

## 5. Legacy findings — disposition

From `VSHARES_PROJECT_DISCOVERY.md` §5.

| ID | Finding | Status |
|---|---|---|
| S1 | Hardcoded credentials | **Closed**: file removed on the rebuild branch; credentials revoked (owner-confirmed); history unchanged by owner instruction (SEC-2026-001) |
| S2 | Open redirect in auth callback | **Fixed** in legacy code (commit `e1c1ac6`), behaviour checked against six inputs; reimplemented with tests in M2 |
| S3 | Demo-mode cookie auth bypass | **Open** in legacy code; removed when the legacy app is replaced in M1/M2 (owner-approved). Not patched in place because the legacy smoke test and pages depend on it and the code is being deleted |
| S4 | No input validation | Open in legacy; designed out (pipeline step 3) — M1 |
| S5 | Raw DB errors to clients | Open in legacy; designed out (error envelope) — M1 |
| S6 | No rate limiting | Open in legacy; designed in — M1 |
| S7 | No security headers | Open in legacy; designed in — M1 |
| S8 | Unpinned dependencies, 19 advisories | **Fixed**: versions pinned; see §7 |
| S9 | Weak seed passwords | Open in legacy; seed rewritten — M1 |
| S10 | World-readable profiles | Designed out: private by default |
| C1 | Signup failure on handle collision | Designed out: generated handles — M2 |

Until M2 lands, the legacy app must be treated as **not safe for real users**.

## 6. Privacy and data protection (UK GDPR)

Assumptions: adults (18+), UK launch, free service, owner is the data controller. This is an engineering assessment, not legal advice; a privacy notice and terms need owner or legal sign-off before launch.

| Topic | Position |
|---|---|
| Lawful bases | Account and service delivery: contract. Personalised ranking from the user's own activity: contract / legitimate interests, with an off switch. Product analytics: legitimate interests for strictly first-party, pseudonymous measurement, with opt-out; **owner to confirm, or switch to consent**. |
| Aggregate measurement | **Implemented and tested (M7).** `analytics_daily` holds no identifier of any kind, so it is recorded for everyone including people who have consented to nothing. Breakdowns below five are withheld by the database. Staff can read aggregates and cannot read one person's events or one person's first-win timing at all. Four end-to-end checks confirm no tracking cookie, no tracking key in browser storage and no third-party request on any route |
| Anonymity claims | We do not call the identified event stream anonymous, because it is not: it carries a user id until the account is deleted, at which point it is nulled. We do call `analytics_daily` identifier-free, because it has no column that could identify anyone |
| Device storage (PECR) | Only strictly necessary cookies (session, guest session, CSRF, consent choice) are set without consent. No advertising or third-party cookies. The analytics session ID is held in memory/sessionStorage; whether it is "strictly necessary" is a judgement call, so the default until confirmed is: **no analytics identifiers before the user accepts** — aggregate, identifier-free counts only. |
| Personal data inventory | `VSHARES_DATA_INVENTORY.md`, produced by querying the live schema rather than from the data model document. It found and fixed one defect: an orphaned user identifier in `account_merges`. |
| Data minimisation | Email, handle, optional name and avatar, topics, interaction history. No date of birth, location, contacts or device fingerprint. No sensitive-trait inference. |
| Age | Sign-up requires confirming 18+. No age verification technology in the MVP. Content is general-audience. |
| Transparency | Privacy notice; "Why this?" on recommendations; preference-memory page. |
| Rights | **Implemented and tested at the database layer (M6).** Access and portability: `export_my_data()`, which takes no argument and so can only describe its caller. Erasure: `delete_my_account()`, requiring a typed confirmation and a sign-in within the last fifteen minutes; three categories survive anonymised, listed in `VSHARES_DATA_INVENTORY.md`. Rectification: editable profile and preferences, plus correction and resubmission of a rejected contribution. Objection: personalisation and analytics switches. End-to-end verification through a real sign-in is still outstanding, so full erasure is not yet claimed as production-verified. |
| Retention | Table in `VSHARES_DATA_MODEL.md` §A9. Guest accounts: `VSHARES_GUEST_LIFECYCLE.md` — 30 days measured against last activity, implemented, tested, audited, and **deliberately not scheduled** pending owner approval. |
| Processors | Supabase (database, auth, storage), the hosting provider, Google (only for users who choose Google sign-in), an email delivery provider for magic links. Each needs a DPA and a region decision. |
| Residency | Choose a UK or EU Supabase region. International transfers to be listed in the privacy notice once providers are fixed. |
| Automated decisions | Ranking has no legal or similarly significant effect; explained and switchable. |
| Breach handling | Runbook entry: assess, contain, record; ICO notification within 72 hours where required. |
| DPIA | A short DPIA is recommended before launch because the product profiles learning behaviour; template to be prepared in M7. |

## 7. Dependency status (2026-11-14)

| | Before | After controlled upgrade |
|---|---|---|
| Declared ranges | all `latest` | exact versions |
| `npm audit` total | 19 (1 critical, 8 high, 10 moderate) | 8 moderate |
| Production dependencies | affected (incl. critical in `next`) | **0** (`npm audit --omit=dev`) |
| Regression checks | — | clean `npm ci`, lint, typecheck, smoke, build: all pass |

Upgrade approach: stay within current majors (Next 16.2.9 → 16.4.6, React 19.2 → 19.3, Supabase client and Tailwind patch/minor), then `npm audit fix` for transitive packages. No major-version jumps (ESLint 10, TypeScript 7) were taken; they are scheduled as separate, individually tested changes.

**Outstanding:** one moderate advisory (GHSA-g3hv-75wg-m249, `minimatch` 10.x denial of service) reached only through `typescript-eslint` inside the lint toolchain; npm counts it as 8 packages. It is development-only, processes only our own glob patterns, and never runs in production. The only offered "fix" downgrades `eslint-config-next` by a major version. Decision: accept and track; re-check on each dependency update; CI fails on any high or critical advisory and on any production advisory.

## 8. Security testing plan

| Layer | What | When |
|---|---|---|
| Static | TypeScript strict, ESLint (incl. import boundaries, no `dangerouslySetInnerHTML`), gitleaks, npm audit | Every push (CI) |
| Unit | Validation schemas, redirect sanitiser, URL rules, ranking, log and error-message privacy, metric definitions | Every push |
| Database | RLS isolation per table with two users, guest restrictions, append-only guards, export contents, erasure completeness, purge eligibility, rollup replay protection, suppression, staff isolation | Every push (PostgreSQL service in CI; 378 assertions) |
| Integration | Each server action as visitor, guest, user, moderator, admin | Every push |
| E2E | Auth flows, protected routes, headers, CSP | Every push |
| Manual review | ASVS L2 checklist walk-through; results in `VSHARES_TEST_REPORT.md` | M7 |
| External | Independent penetration test | Recommended before scaling beyond the first cohort; cost needs approval |
