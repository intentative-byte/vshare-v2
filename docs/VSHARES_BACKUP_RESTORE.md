# VSHARES — Backup and restore

- Date: 2026-11-15 · Milestone 8
- **This is an executed drill, not a documented procedure.** The results below
  are from running `scripts/backup-restore-drill.mjs` against a real
  PostgreSQL 16 server. Re-run it with `npm run drill:backup`.

## 1. What the drill does

Against two scratch databases it never keeps:

1. Builds a source database from the harness and all but the last migration,
   and populates it through the **real functions** — an admin creates a
   category and topic, a card is created as a draft, the service records a
   link check, and it is approved and published. Seeding this way exercises
   the same constraints a real database was filled under, rather than raw
   inserts that could sidestep them.
2. Takes a backup with `pg_dump -Fc` (custom format).
3. Drops the source entirely.
4. Restores the dump into a fresh database with `pg_restore --no-owner --no-acl`.
5. Verifies the restore against the source.
6. Applies the one held-back migration on top, to prove schema-migration
   compatibility.

## 2. Results (executed 2026-11-15, PostgreSQL 16)

| Check | Result |
|---|---|
| Backup file produced | **pass** — 187 KB custom-format dump |
| User rows match | **pass** — 2 vs 2 |
| Card rows match | **pass** — 1 vs 1 |
| Content checksum matches | **pass** — md5 of all version titles identical |
| Published card still resolves its current version | **pass** |
| Row-level security still enabled on its tables | **pass** — `profiles`, `content_interactions`, `analytics_events`, `learner_milestones` |
| Security-definer functions still execute | **pass** — `app.current_user_id()` returns null with no claims, as it should |
| RLS policies restored | **pass** — 33 policies |
| A later migration applies on top of the restore | **pass** — `20261114180000_analytics.sql` |

**9 of 9 checks passed.**

## 3. What the drill demonstrates about integrity

- **Data** comes back row-for-row, verified by count and by a content checksum
  rather than by eye.
- **The security boundary** comes back with it: row-level security is schema,
  so a restore that dropped it would be a silent catastrophe. The drill
  asserts it is still on, and that all 33 policies returned.
- **Forward compatibility**: a backup taken before a migration can be restored
  and then brought up to date, which is the real recovery path after a bad
  deploy.

## 4. What it does not cover, and why

| Not covered | Why, and where it is handled |
|---|---|
| The hosted platform's own backups (point-in-time recovery) | No hosted project exists yet. When one does, its provider's PITR is the first line; this drill is the second, for restoring into a *different* environment |
| Secrets and encrypted data | VSHARES holds no application secrets in the database (D: secrets live in the environment, never the repository or a table). A dump therefore contains no key material to recover. Network secrets live on the environment, not in Postgres, so they are a platform-restore concern, not a database one |
| `auth.users` as the real auth service manages it | The harness stands in for the auth schema locally. A real backup of a hosted project includes the auth schema in the same dump, so the restore path is the same; what the local drill cannot prove is the auth *service* reconnecting to a restored database. That is an item on the live-verification checklist |
| Large-database timing | The drill is small by design — it proves correctness, not throughput. Restore time on a real dataset is a platform measurement for when one exists |

## 5. Recovery limitations (stated plainly)

- A restore brings back the database. It does **not** bring back anything that
  was only ever on the environment: variables, network secrets, the setup
  script. Those are recovered from the platform's configuration, not from a
  database dump.
- A restore is only as fresh as the last backup. Until a hosted project with
  scheduled backups exists, there is no automatic backup — this drill proves
  the mechanism works, not that a schedule is running.
- The held-back-migration check proves a backup can be rolled *forward*. It does
  not prove a migration can be rolled *back*; VSHARES has no down-migrations,
  by decision, so recovery from a bad migration is restore-then-reapply, not
  reverse-the-migration.

## 6. Runbook: restoring after a loss

1. Provision a fresh database on the chosen platform.
2. Restore the most recent `pg_dump` with `pg_restore --no-owner --no-acl`.
3. Apply any migrations newer than the backup, in filename order.
4. Run `npm run test:db` against the restored database to confirm every policy
   and function behaves — the same 395 assertions that gate every change.
5. Re-point the application's environment at the restored database and confirm
   `/api/ready` reports healthy.
6. Record the incident, the backup used, and the data-loss window in the
   operational log.
