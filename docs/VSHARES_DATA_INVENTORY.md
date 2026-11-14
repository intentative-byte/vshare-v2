# VSHARES — Personal data inventory

- Date: 2026-11-14
- Produced by querying the live schema for every foreign key to a user, then reading each table. It is the basis for the export and the deletion, so it has to be complete rather than plausible.

## How this was produced

```sql
select c.table_name, c.column_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage c on c.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'auth' and ccu.table_name = 'users';
```

Then every table was read for identifiers held **without** a foreign key,
which is how the one real problem below was found.

## What the inventory found

`account_merges.guest_user_id` held a user identifier as a bare column with
no foreign key. Deleting that guest account would have left the identifier
in place for ever — orphaned personal data that nothing would ever clean up.
It now has a foreign key that nulls it on deletion, and a test proves it.

## The inventory

| Table | Column | On account deletion | In the export | Why |
|---|---|---|---|---|
| `auth.users` | `id`, `email`, `is_anonymous`, `created_at` | **Deleted** | Yes | The account itself |
| `profiles` | `user_id` | **Deleted** (cascade) | Yes | Handle, display name, visibility, locale |
| `preferences` | `user_id` | **Deleted** (cascade) | Yes | Personalisation switch, consent, session length |
| `consent_events` | `user_id` | **Deleted** (cascade) | Yes | When consent was given or withdrawn |
| `user_roles` | `user_id` | **Deleted** (cascade) | Yes | Roles held |
| `user_roles` | `granted_by` | Set null | No | Who granted someone else's role |
| `user_topics` | `user_id` | **Deleted** (cascade) | Yes | Chosen topics, learned affinity, level |
| `content_interactions` | `user_id` | **Deleted** (cascade) | Yes | Opens, completions, saves, likes, skips, feedback |
| `feed_sessions` | `user_id` | **Deleted** (cascade) | Yes | Sessions and their timing |
| `recommendations` | `user_id` | **Deleted** (cascade) | Yes | What was recommended and the components behind it |
| `analytics_events` | `user_id` | Set null | Yes | Only ever written with consent; survives anonymised so counts stay correct |
| `content_reports` | `reporter_id` | Set null | Yes (own reports) | The report survives for the moderator; the reporter does not |
| `content_reports` | `resolved_by` | Set null | No | Which moderator resolved it |
| `content_items` | `submitted_by` | Set null, **and unpublished submissions are deleted** | Yes (own submissions) | Published contributions stay for other people; unpublished ones have no public value |
| `content_items` | `reviewed_by` | Set null | No | Who reviewed something |
| `content_versions` | `created_by` | Set null | No (the text appears under submissions) | Version authorship |
| `moderation_actions` | `actor_id` | Set null | No | Our decisions, not the person's data |
| `audit_log` | `actor_id` | Set null | No | Our decisions, not the person's data |
| `account_merges` | `target_user_id` | **Deleted** (cascade) | Yes (dates only) | That a guest was merged in |
| `account_merges` | `guest_user_id` | Set null | No | **Was orphaned; fixed** |
| `ranking_configs` | `created_by` | Set null | No | Who changed the ranking weights |
| `content_stats`, `analytics_daily` | — | Unaffected | No | Aggregates with no identifier in them at all |

## Retention exceptions

Three categories survive a deletion, each anonymised:

1. **Published contributions.** A resource someone recommended stays in the catalogue with their name removed. Removing it would take something from everyone else for no gain in privacy, since the card is about a third-party page and not about them.
2. **Moderation and audit records.** They record that a decision was made, with the actor set to null. They are evidence about our own conduct.
3. **Aggregate counts.** `analytics_daily` and `content_stats` never contained an identifier, so there is nothing in them to remove.

Nothing retained can identify the person. The deletion audit entry records a
one-way digest of the account id and counts of what was removed, so the same
account cannot be silently deleted twice while the log holds no identifier.

## The export format

`vshares.export.v1`, JSON, produced by `public.export_my_data()`. It takes no
argument, so it can only ever describe the caller. It carries the account,
profile, preferences, consent history, roles, topics, interactions, sessions,
recommendations, submissions, reports, analytics events and merge records.

It deliberately excludes the internal moderation trail and the identity of
other people, which are records of our decisions rather than data about the
person asking.

## What is verified

Thirty-three assertions in `supabase/tests/cases/190_data_rights.sql`,
against real PostgreSQL. They prove that the export contains each category
and nothing belonging to anyone else; that deletion needs a confirmation and
a recent sign-in; that every table above is emptied or anonymised; that
published content survives; that the audit entry holds no identifier; and
that no orphaned identifier is left behind.
