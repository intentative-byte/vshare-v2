# VSHARES — Live verification checklist, Milestones 1 to 7

- Date: 2026-11-14 · **Release blocker.** Nothing here may be marked done from a
  simulation.
- 62 end-to-end checks are written and skipped for want of a running service.
  This is the consolidated list of what they cover, what each one needs, and the
  order to clear them in.

## 1. Why they are skipped rather than passing

The build environment has PostgreSQL but no container runtime and no outbound
network, so the auth service cannot run. A test that needs a sign-in therefore
cannot exercise what it names.

The rule applied throughout (D-037): **a test that would pass without doing the
thing it describes is worse than no test.** None of these has been replaced with a
weaker check, and none is reported as passing.

## 2. What clearing them requires

One of:

- **A hosted development project.** Steps in `VSHARES_SUPABASE_SETUP.md`. It needs
  the project URL and the publishable (anon) key only — never the service-role
  key — costs nothing on the free tier, and unblocks every row below except the
  three that need a privileged client.
- **A container runtime in the build environment**, which would let the full local
  stack run and clear everything including the privileged rows.

Three checks additionally need a **privileged client** (the service-role key, held
server-side and never in a browser or in chat) because they call `rollup_day`,
`reconcile_day` or `purge_stale_guests`.

## 3. The checklist

### Milestone 2 — identity (5 checks, `auth-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 2.1 | The sign-in form accepts an address and reports that a link was sent | Auth service |
| 2.2 | An unknown and a known address are answered identically (no account enumeration) | Auth service |
| 2.3 | A guest who acts gets an account and keeps it when they register | Auth service |
| 2.4 | Signing out ends the session | Auth service |
| 2.5 | Signing out everywhere ends it on every device | Auth service, two browsers |

### Milestone 3 — catalogue (3 checks, `catalogue-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 3.1 | Explore lists categories from the database, not from the seed list | Database |
| 3.2 | A category page lists its topics and warns on high-impact ones | Database |
| 3.3 | An unpublished card is not reachable in public | Database |

### Milestone 4 — feed and ranking (6 checks, `feed-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 4.1 | A session shows position, progress and a stopping point | Database + published cards |
| 4.2 | A recommendation can explain itself from its logged breakdown | Database + published cards |
| 4.3 | The session ends with a summary and does not refill itself | Database + published cards |
| 4.4 | Opening a card does not record it as completed | Database + published cards |
| 4.5 | A visitor with no account gets a readable session with nothing stored about them | Database + published cards |
| 4.6 | A visitor gets an account the moment they complete something, and not before | Database + published cards |

### Milestone 5 — first learning win (5 checks, `first-win-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 5.1 | A visitor reaches a useful card with no account | Database + published cards |
| 5.2 | Completing produces a win summary and a non-blocking offer | Database + published cards |
| 5.3 | The completion survives into the progress dashboard | Database + published cards |
| 5.4 | Saving puts something in the library and it can be removed | Database + published cards |
| 5.5 | The Path tab names a next step and the rule behind it | Database + published cards |
| 5.6 | **The 60-second first-win benchmark, measured on a real journey** | All of the above. This is the product's own acceptance criterion and has never been measured |

### Milestone 6 — submissions and data rights (5 checks, `data-rights-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 6.1 | A submission reaches the queue and says it is not published | Auth service |
| 6.2 | My submissions shows only mine | Auth service, two accounts |
| 6.3 | The export downloads a documented file | Auth service |
| 6.4 | A card can be shared by its public address | Database + published cards |
| 6.5 | Reporting the same card twice is refused | Auth service + published cards |
| 6.6 | **Account deletion end to end, through a real sign-in.** Until this passes, full erasure is proven at the database layer only and is not claimed | Auth service |

### Milestone 7 — measurement (8 checks, `analytics-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 7.1 | A moderator sees the dashboard and every figure carries its definition | Auth service, staff role, a computed rollup |
| 7.2 | The period filter changes the window | As above |
| 7.3 | Application and outcome show no number | As above |
| 7.4 | A topic below the suppression threshold is shown as withheld | As above, plus a small topic |
| 7.5 | Every chart has the same numbers available as a table | As above |
| 7.6 | A learner completing a card moves the next day's figures | As above + **privileged client** to run the rollup |
| 7.7 | The first-win time is recorded once, and a reload does not report a faster one | Auth service |
| 7.8 | A learner signed in cannot reach the dashboard | Auth service |

### Milestone 8 — admin interface (5 checks, `admin-live.spec.ts`)

| # | Check | Needs |
|---|---|---|
| 8A.1 | An admin creates a category and it appears in the list | Auth service, admin account |
| 8A.2 | A new card enters as a draft and cannot publish without a link check | Auth service, moderator account |
| 8A.3 | A moderator does not see taxonomy management succeed (DB refuses) | Auth service, moderator account |
| 8A.4 | The audit log lists recorded actions for an admin | Auth service, admin account |
| 8A.5 | A card's version history keeps every version | Auth service, moderator + a card |

The database layer for all of these is covered and **passing** in
`supabase/tests/cases/230_admin_access.sql` (14 assertions). What is skipped is
only the rendered journey through a real sign-in.

### Operational, not yet written as tests

| # | Check | Needs |
|---|---|---|
| O.1 | The nightly rollup runs on a schedule and reconciles | Scheduler + privileged client. See `VSHARES_SCHEDULED_JOBS.md` |
| O.2 | The guest purge dry run runs daily and reports | Scheduler + privileged client. Approved; destructive purge is not |
| O.3 | Backup and restore drill | A hosted project. Milestone 8 |
| O.4 | Source link checking for the first ten cards | Outbound network. **Blocks publishing anything** |
| O.5 | Manual screen-reader pass | Milestone 8 |

## 4. Order to clear them in

1. Create the development project (`VSHARES_SUPABASE_SETUP.md`) → clears 2.x, 3.x, 6.1–6.3, 6.6, 7.7, 7.8, 8A.1–8A.5.
2. Check the first ten source links where the web is reachable, then publish them → clears 4.x, 5.x, 6.4, 6.5.
3. Add a privileged client to the scheduler and run one rollup → clears 7.1–7.6 and O.1, O.2.
4. Measure the 60-second benchmark (5.6) and record the real number.

## 5. Status

| | Count |
|---|---|
| Written and skipped | 72 (62 + 10 admin-interface journeys added in M8) |
| Passing without a service | 90 |
| Of the skipped, needing only a database or auth service | 69 |
| Of the skipped, needing a privileged client as well | 3 |

The count rises because Milestone 8 **added** the admin interface and its live
journeys, not because any check was removed. No skipped test has ever been
deleted or weakened to lower this number (D-037).

**None of these may be reported as passing until it has run.** When one does run,
record the result in `VSHARES_TEST_REPORT.md` with the date and the environment.
