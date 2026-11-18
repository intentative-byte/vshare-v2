# VSHARES — Guest account lifecycle

- Date: 2026-11-14 · Status: **policy written, implemented and tested. Not scheduled.**

A guest account exists so that someone can learn before deciding whether to
register. It is a real account with real data, and it is deleted when it is
clearly abandoned — not merely when it is old.

## When a guest account is created

On the first action that has to survive: completing, saving, liking or
skipping a card, or choosing topics. **Not on page view, and not on reading.**
Someone who reads and leaves creates nothing.

## When one is removed

An account is eligible for removal only when **all** of these hold:

1. It is still anonymous — it has not been converted to a registered account.
2. It has no email address against it.
3. It was created before the cutoff, which is 30 days by default.
4. It has recorded no interaction since the cutoff.
5. It has started no session since the cutoff.

Conditions 4 and 5 are what stop someone in the middle of learning being
swept up. An account created a year ago but used last week is never eligible.

## How it runs

```sql
select app.purge_stale_guests(interval '30 days', true);   -- report only
select app.purge_stale_guests(interval '30 days', false);  -- delete
```

**It reports by default.** The dry run is the default argument, so an
accidental call changes nothing. Both forms return the same evidence:

```json
{
  "dry_run": true,
  "cutoff": "2026-10-15T12:00:00+00:00",
  "guests_examined": 412,
  "eligible": 37,
  "deleted": 0,
  "kept_recent_activity": 12,
  "kept_converted": 88
}
```

`kept_recent_activity` and `kept_converted` are there so a run shows what it
decided *not* to do, which is the part worth checking.

Every real run is written to the audit log, including one that deletes
nothing: the evidence that the job ran matters as much as what it removed.

## Safety properties, each tested

| Property | How it is guaranteed |
|---|---|
| Safe to run repeatedly | A second run finds nothing and deletes nothing. Tested |
| Respects active learning | An old guest with recent activity is kept. Tested |
| Preserves converted accounts | A converted account is out of scope whatever its age. Tested |
| Cannot be run by a viewer | Execute is revoked from `anon` and `authenticated`. Tested |
| Produces evidence | Returns counts; audits every real run. Tested |
| Recoverable from failure | It is a single statement in one transaction: it either removes the eligible set or nothing |
| Removes everything | Deletion cascades exactly as the data inventory records |

## What is deliberately not done

**It is not scheduled.** Irreversible automatic deletion is not enabled, and
will not be without approval. Running it by hand, starting with the dry run,
is how it is used until then.

When it is scheduled, the recommended setup is a daily dry run with the
result reported, and a weekly real run — so that a sudden jump in the
eligible count is noticed before anything is removed.

## Retention summary

| Account | Kept for |
|---|---|
| Guest, abandoned | 30 days from creation, measured against last activity |
| Guest, active | Indefinitely, while it is being used |
| Guest, converted | Treated as a registered account; no automatic removal |
| Registered | Until the person deletes it |
