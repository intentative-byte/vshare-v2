# VSHARES — Scheduled jobs

- Date: 2026-11-14 · Milestone 7
- **Nothing in this document is scheduled yet.** It records the configuration each
  job needs, which are approved, and which are not.

## 1. Approval status

| Job | What it does | Destructive? | Status |
|---|---|---|---|
| `rollup_day` | Recomputes one day's derived metrics from the product tables | No. Deletes and rewrites only that day's own derived rows | **Not yet scheduled.** Needs owner approval of the schedule below |
| `purge_stale_guests(interval, true)` | **Dry run.** Reports which guest accounts would be eligible | No. Changes nothing | **APPROVED** (owner, Milestone 7 §9): daily, non-destructive, reporting only |
| `purge_stale_guests(interval, false)` | **Real purge.** Deletes abandoned guest accounts | **Yes, irreversible** | **NOT APPROVED.** Documented, implemented, tested, and deliberately not scheduled |
| `reconcile_day` | Compares stored figures against a fresh count | No. Read-only | Recommended alongside the rollup |

## 2. What a scheduler needs

All three functions are revoked from `anon` and `authenticated` and granted to
`service_role` only. A scheduled job therefore needs a **privileged client**.

That key is held by the platform running the job and never appears in a browser,
in this repository, in a log, or in chat. On the chosen host it is an environment
variable or a secret store entry; nothing else in VSHARES reads it.

**No scheduler is configured, because no deployment platform has been chosen.**
The three realistic options, in the order they would be preferred:

### Option A — the database's own scheduler (`pg_cron`)

Simplest where the host offers it, because the job runs with database privileges
and no key leaves the database at all.

```sql
-- Yesterday's figures, shortly after midnight UTC.
select cron.schedule('vshares-rollup', '20 0 * * *', $$
  select public.rollup_day((now() at time zone 'UTC')::date - 1);
$$);

-- The same day again a little later, to catch late-arriving rows.
select cron.schedule('vshares-rollup-catchup', '20 2 * * *', $$
  select public.rollup_day((now() at time zone 'UTC')::date - 1);
$$);

-- Approved: a daily dry run that changes nothing and reports what it found.
select cron.schedule('vshares-guest-dry-run', '30 3 * * *', $$
  insert into public.audit_log (actor_id, action, target_type, target_id, diff)
  select null, 'guests.purge_dry_run', 'job', 'daily',
         app.purge_stale_guests(interval '30 days', true);
$$);
```

The rollup is idempotent, so running it twice is safe and is the point of the
catch-up job.

### Option B — a scheduled function on the hosting platform

A small function holding the privileged key, calling the same three RPCs on the
same schedule. Needs the key in the platform's secret store.

### Option C — an external scheduler calling a protected route

Least preferred: it puts an authenticated route on the public internet. If chosen,
it needs a shared secret in a header, a constant-time comparison, and a rate limit.

## 3. The schedule, and why

| Job | When (UTC) | Why then |
|---|---|---|
| Rollup, yesterday | 00:20 | After midnight UTC so the day is complete. Twenty past, not on the hour, so it does not collide with everything else that runs at midnight |
| Rollup, yesterday again | 02:20 | Catches anything written late. Idempotent, so it simply replaces the same rows |
| Guest purge **dry run** | 03:30 | After the rollups, so the report reflects the figures that were just computed |
| Reconciliation | With each rollup | A mismatch is a signal worth seeing the next morning, not a month later |

## 4. Backfill

The rollup takes any past day, so a gap is filled by running it for each missing
day. Measured at 94 ms per day on 80,000 interactions across 60 days; the whole
60-day window takes about four seconds.

```sql
select public.rollup_day(d::date)
from generate_series(now() - interval '60 days', now(), interval '1 day') d;
```

Caution, and it is a real one: **recomputing an old day after someone has deleted
their account produces a lower number than was stored**, because the rows it
counted are gone. That is not an error. Reconciliation reports
`erasures_since_rollup` so the drift can be explained. Backfill freely over recent
days; think before recomputing a quarter-old day whose figures have been reported.

## 5. Monitoring

Each job should be watched for:

| Signal | What it means |
|---|---|
| A rollup did not run | `analytics_rollups` has a gap. The dashboard shows the day as absent, which is the intended behaviour, not a silent zero |
| `reconcile_day` reports mismatches with no erasures | Something is wrong. Investigate before trusting the day |
| The eligible count in the guest dry run jumps | Look before anything is ever deleted. This is the main reason the dry run is daily and the real purge is not scheduled at all |
| A rollup takes much longer than ~100 ms per day | Re-measure with `scripts/measure-analytics-performance.mjs` and consider an index then, not before |

## 6. What switching on the real purge would need

1. Owner approval, explicitly, for irreversible scheduled deletion.
2. A period of daily dry-run reports showing a stable, explainable eligible count.
3. A verified backup and restore drill (Milestone 8, O.3).
4. A first real run executed by hand, with the output recorded, before any
   schedule is created.

Until all four, the entry stays as it is: implemented, tested, and not scheduled.
