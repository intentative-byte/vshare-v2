# VSHARES — Data Model

- Version: 1.0 (design; no migrations written yet) · Date: 2026-11-14
- Reference material: PR #1's `db/schema.sql` (topics, content memory, events, ranking) informed this design; it is not copied verbatim.
- Part A is the MVP schema. Part B lists later entities so the MVP does not block them.

## Conventions

- Primary keys `uuid` (`gen_random_uuid()`); join tables use composite keys; logs use `bigint` identity.
- `created_at` / `updated_at` `timestamptz` (UTC); `updated_at` maintained by trigger.
- Closed sets are Postgres enums; admin-editable sets are tables.
- Length and format limits are `check` constraints mirrored by Zod schemas.
- **Row-level security is enabled on every table.** "Server only" = no policy lets a user-scoped client write; changes go through server functions.
- Foreign keys to a user cascade on delete unless stated, so account deletion is complete by construction.
- Roles in policies: `anon` (no session), `guest` (anonymous user), `user`, `moderator`, `admin`. Policies never call vendor functions directly: they use our helpers `app.current_user_id()`, `app.is_guest()` and `has_role()`, which today wrap Supabase's `auth.uid()` and the `is_anonymous` JWT claim. Replacing the auth provider means re-implementing those helpers only.

---

# Part A — MVP schema

## A1. Identity and preferences

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK → `auth.users` | cascade |
| `handle` | text unique | 3–24 chars, `[a-z0-9_]`; generated server-side, never from provider metadata |
| `display_name` | text null | ≤ 60 |
| `avatar_path` | text null | Storage path, not a URL |
| `is_public` | boolean | default false |
| `locale`, `timezone` | text | defaults `en-GB`, `Europe/London` |

Policies: owner select/update (not `user_id`); others select only where `is_public`. Insert by signup trigger.

### `user_roles`
(`user_id`, `role` enum `moderator` | `admin`) PK; `granted_by`, `granted_at`. Everyone is a learner by default (no row). Policies: select own; write server only.

### `preferences`
`user_id` PK; `personalisation_enabled` bool default true; `analytics_consent` enum (`unset`, `granted`, `denied`); `session_minutes` int 5–60 default 10. Owner select/update.

### `user_topics` — declared interests and preference memory
| Column | Type | Notes |
|---|---|---|
| `user_id`, `topic_id` | PK | |
| `declared` | boolean | chosen by the user |
| `affinity` | numeric(4,3) | 0–1; learned; see ranking spec |
| `level` | enum `beginner` / `intermediate` / `advanced` | default beginner |
| `level_overridden` | boolean | user set it manually |

Policies: owner select; owner may set `declared`, `level`; `affinity` server only (column-level grant). Owner may delete (reset).

## A2. Taxonomy

### `categories`
`id`; `slug` unique; `name`; `description`; `sort_order`; `is_high_impact` bool; `archived_at`. Public select where not archived; admin write.

### `topics`
`id`; `category_id` → categories (restrict); `slug` unique; `name`; `description`; `sort_order`; `archived_at`. Same policies.

### `topic_adjacency`
(`topic_id`, `adjacent_topic_id`) — curated neighbours used for the feed's discovery slot. Public select; admin write.

## A3. Content

### `content_items` — value cards
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | public URL |
| `kind` | enum | MVP: `external_resource`. Reserved: `lesson`, `article`, `video`, `audio` |
| `origin` | enum | `curated`, `user_submitted`. Reserved: `creator`, `ingested` |
| `status` | enum | `pending`, `published`, `rejected`, `archived` |
| `title` | text | 8–120 |
| `summary` | text | 40–400, original wording |
| `takeaways` | text[] | 1–3 items, each ≤ 240 |
| `source_url` | text | https only; normalised; unique among non-rejected items |
| `source_name` | text | publisher or creator |
| `source_author` | text null | |
| `format` | enum | `article`, `video`, `podcast`, `course`, `tool`, `book` |
| `estimated_minutes` | int | 1–600 |
| `level` | enum | beginner / intermediate / advanced |
| `primary_topic_id` | → topics | restrict |
| `quality_score` | int | 0–100, editorial; default 50 for submissions |
| `is_ai_assisted` | boolean | summary drafted with AI |
| `is_high_impact` | boolean | finance, health, legal → notice + moderator review |
| `submitted_by` | → users null | set null on user deletion |
| `reviewed_by` | → users null | set null on user deletion |
| `reviewed_at`, `published_at` | timestamptz null | |
| `rejection_reason` | text null | shown to submitter |
| `link_checked_at`, `link_status` | | last automated reachability check (job added with ingestion work; column reserved) |

Constraints: `published` requires `reviewed_by`, `published_at`, ≥ 1 takeaway. Policies: anyone selects `published`; submitter selects own in any status; moderators select all; users insert only with `origin = user_submitted`, `status = pending`, `submitted_by = app.current_user_id()`, and not as guests; all other writes moderator/admin through server functions.

### `content_topics`
(`content_id`, `topic_id`) secondary topics. Public select for published items; moderator write.

### `content_reports`
`id`; `content_id`; `reporter_id`; `reason` enum (`broken_link`, `inaccurate`, `harmful`, `spam`, `copyright`, `other`); `note` ≤ 500; `status` (`open`, `actioned`, `dismissed`); `resolved_by`; unique open report per (content, reporter). Reporter insert (not guests) and select own; moderators all.

### `moderation_actions`
Append-only: `id` bigint; `content_id`; `actor_id`; `action` enum (`approve`, `reject`, `edit`, `archive`, `restore`, `resolve_report`); `reason`; `diff` jsonb; `created_at`. Moderator select; server-only insert.

## A4. Interactions and progress

### `content_interactions` — one row per user and card; the feed's memory
| Column | Type | Notes |
|---|---|---|
| `user_id`, `content_id` | PK | cascade both |
| `impressions` | int | server-incremented |
| `last_impressed_at`, `opened_at`, `completed_at`, `saved_at`, `liked_at`, `skipped_at` | timestamptz null | null = not in that state |
| `feedback` | enum null | `useful`, `not_useful` |
| `completed_minutes` | int null | snapshot of the card's estimate at completion |

Policies: owner select. All writes through server functions (`record_impressions`, `set_interaction`) that validate transitions (e.g. complete requires the card to be published), update `user_topics.affinity`, and write the analytics event in the same transaction.

The saved library is `saved_at is not null`; history is `completed_at is not null`. Progress summaries (completions, minutes, topics, active days) are views over this table — no stored counters to drift.

### `recommendations`
`id` bigint; `user_id`; `surface` enum (`feed`, `next_best`, `first_win`, `follow_up`); `content_id`; `position`; `session_id`; `config_version`; `score`; `components` jsonb; `shown_at`; `outcome` enum null (`opened`, `completed`, `skipped`, `ignored`). Owner select; server-only write. Retained 13 months.

### `ranking_configs`
`version` int PK; `weights` jsonb (schema-validated); `params` jsonb; `is_active` (partial unique index: one active); `created_by`; `note`. Server read; admin write (audited).

## A5. Platform

### `analytics_events`
`id` bigint; `occurred_at`; `name` text (check against the vocabulary); `user_id` null (**set null** on user deletion); `session_id` uuid; `content_id`, `topic_id`, `category_id` null; `source` text null; `device_class` enum; `props` jsonb. No client policies: insert via server only; read via rollups.

### `event_rollups_daily`
(`day`, `name`, `dimension`, `dimension_id`) PK; `events`; `unique_users`. Admin select. Built by a scheduled SQL function.

### `feature_flags`
`key` PK; `enabled`; `description`; `updated_by`. Server read; admin write.

### `audit_log`
Append-only: `id` bigint; `actor_id` (kept as opaque ID after deletion); `action`; `target_type`; `target_id`; `diff` jsonb; `created_at`. Admin select; server-only insert; update/delete revoked and guarded by trigger.

### `rate_limits`
(`bucket_key`, `window_start`) PK; `count`. Fixed-window counters used by `platform/rate-limit`; server only; purged hourly. Kept in Postgres so no extra service is needed at MVP scale.

## A6. Relationships

```text
categories ─< topics ─< content_items >─< content_topics
                │            │  ├─< content_reports
 user_topics >──┘            │  └─< moderation_actions
     │                       │
   users ─┬─ profiles        ├─< content_interactions >─ users
          ├─ preferences     └─< recommendations >─ users
          └─< user_roles
 analytics_events ─(rollup)─> event_rollups_daily
```

## A7. Indexes (initial; confirmed against query plans when each query is written)

- `content_items (status, primary_topic_id, published_at desc)` — candidates, topic pages.
- `content_items (status, created_at)` where `status = 'pending'` — moderation queue.
- Unique `content_items (source_url)` where `status <> 'rejected'`.
- GIN on a generated `tsvector(title, summary, source_name)` — search.
- `content_interactions (user_id, saved_at desc)` where `saved_at is not null`; same for `completed_at`.
- `content_interactions (user_id, last_impressed_at)`.
- `recommendations (user_id, shown_at desc)`.
- `analytics_events (occurred_at)`, `(name, occurred_at)`, `(content_id, name)`.

## A8. Server functions (privileged, each with tests)

| Function | Does | Callable by |
|---|---|---|
| `handle_new_user()` trigger | Creates `profiles` (generated unique handle) and `preferences` | Auth insert |
| `app.current_user_id()`, `app.is_guest()` | The only place policies touch the auth provider | Policies |
| `has_role(role)` | Role check for policies | Policies, server |
| `set_interaction(content_id, kind, value)` | Validated state change + affinity update + event | Authenticated incl. guests |
| `record_impressions(content_ids[], session_id)` | Batch impression counters | Authenticated incl. guests |
| `moderate_content(content_id, action, fields, reason)` | Approve / reject / edit / archive + `moderation_actions` + `audit_log` | Moderator, admin |
| `grant_role` / `revoke_role` | Role changes + audit | Admin |
| `merge_guest_into(user_id)` | Moves a guest's interactions to an existing account, earliest timestamps win | Server, after verified sign-in |
| `export_user_data(user_id)` | JSON of all user-owned rows | Server, for the owner only |
| `delete_user(user_id)` | Deletes auth user (cascade), nulls authorship, audits | Server, for the owner only |
| `rollup_events(day)` , `purge_stale_guests()`, `purge_rate_limits()` | Scheduled maintenance | `pg_cron` |

## A9. Retention and deletion

| Data | Retention | On account deletion |
|---|---|---|
| Profile, preferences, topics, interactions, recommendations, reports | Life of account | Deleted |
| Guest accounts | 30 days after last activity | Deleted |
| Submitted cards that were published | Until archived | Kept; `submitted_by` nulled |
| Pending / rejected submissions | 90 days after decision | Deleted |
| `analytics_events` | 13 months | `user_id` nulled |
| Rollups | Indefinite (aggregate) | Unaffected |
| `audit_log`, `moderation_actions` | 24 months | Actor kept as opaque ID |

Periods are proposals pending owner confirmation.

---

# Part B — Later entities (designed for; not created in the MVP)

| Release | Entities | Attaches to |
|---|---|---|
| R2 learning | `skills`, `skill_prerequisites`, `content_skills`, `learning_paths`, `path_modules`, `path_module_items`, `enrolments`, `quizzes`, `questions`, `question_keys` (never client-readable), `quiz_attempts`, `mastery_records`, `review_items` | `content_items` (kind `lesson`), `topics`, users |
| R2 action and motivation | `goals`, `quests`, `quest_progress`, `xp_transactions` (append-only), `achievements`, `user_achievements`, `applied_actions` (with `verification` self-reported / verified), `reflections`, `collections`, `collection_items` | users, `content_items` |
| R2 VAI | `vai_memory_records` (user-visible, deletable), `vai_usage` (LLM metering) | users |
| R3 creators and content depth | `creators`, `content_versions`, `media_assets`, `content_relations`, `creator_analytics_daily`, `follows` | `content_items` (origin `creator`) |
| R3 intelligence | `notification_preferences`, `retention_signals`, `retention_interventions`, `alignment_configs`, `alignment_scores`, `value_leak_findings` | users, rollups |
| Expansion | `opportunities` (mandatory `source_url`, `verified_at`), `listings`, `purchases`, `subscriptions`, `payouts`, `groups`, `discussions` | Requires approved specs |

How the MVP schema keeps these open:
- `content_items.kind` and `origin` already have reserved values, so lessons and creator content are new rows, not a new content system.
- Interaction state is per user and item regardless of kind, so paths and quizzes add tables without changing the feed's memory.
- `recommendations.surface` is an enum that grows (`quest`, `review`, `next_best_move`).
- The analytics vocabulary is extended by adding names (`quiz_attempted`, `quiz_passed`, `applied_logged`) — the funnel IMPRESSION → VIEW → COMPLETE → SAVE → QUIZ → PASS → APPLY → SHARE is already half populated by MVP events.
- Activity, knowledge and applied progress will be three separate ledgers (`xp_transactions`, `mastery_records`, `applied_actions`); the MVP's completion-based summary is the first of the three and is labelled as activity.
