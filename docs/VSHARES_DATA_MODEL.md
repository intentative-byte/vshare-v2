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

### `consent_events`

One row per consent decision, with the choice and when it was made. Cascades on account deletion, and withdrawing consent deletes the events collected under it by trigger.

### `user_topics` — declared interests and preference memory
| Column | Type | Notes |
|---|---|---|
| `user_id`, `topic_id` | PK | |
| `declared` | boolean | chosen by the user |
| `affinity` | numeric(4,3) | 0–1; learned; see ranking spec |
| `level` | enum `beginner` / `intermediate` / `advanced` | default beginner |
| `level_overridden` | boolean | user set it manually |
| `observations` | integer | **M8+ adaptive:** evidence count behind the affinity; confidence = observations/(observations+K) |

### `user_format_affinity` — learned format preference (adaptive learning)
`(user_id, format)` PK; `affinity` numeric(4,3); `observations`; `updated_at`. A small ranker signal, never a filter. Owner-only select; **recomputed** (not incrementally nudged) from the person's `session_reviews` by `record_session_review`, so feedback is idempotent and edits are exact (D-100).

### `session_reviews` — session-end feedback (adaptive learning)
`session_id` PK → `feed_sessions`; `user_id`; `useful` boolean; `rating` smallint (1–5) null; `rating_scale` default 5; `preferred_format` enum null; `note` text null; `content_count`; `created_at`. **Session satisfaction, kept separate from content quality, engagement and demonstrated learning.** Owner-only select; written only by `record_session_review`. **Review eligibility** is verified from authoritative records — the session must be ended AND the person must have engaged (opened/completed/saved/skipped) with ≥1 of its `recommendations` within the session window; `ended_at` alone is not proof (D-103). The recompute is serialised per user by an advisory lock (D-104). It can never publish or admit content.

Policies: owner select; owner may set `declared`, `level`; `affinity` server only (column-level grant). Owner may delete (reset).

## A2. Taxonomy

### `categories`
`id`; `slug` unique; `name`; `description`; `sort_order`; `is_high_impact` bool; `archived_at`. Public select where not archived; admin write.

### `topics`
`id`; `category_id` → categories (restrict); `slug` unique; `name`; `description`; `sort_order`; `archived_at`. Same policies.

### `topic_adjacency` — **not created**
(`topic_id`, `adjacent_topic_id`) — curated neighbours for the feed's discovery slot. The discovery slot shipped in M4 using the category instead, so this table was not needed and was not created. It returns if curated neighbours prove better than the category.

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

### `analytics_daily`
(`day`, `name`, `dimension`, `dimension_key`) PK; `events`. **Holds no identifier of any kind**, so it is recorded for everyone including people who have consented to nothing, and a deletion cannot affect it. Staff select; written by `record_event`. This is what the earlier draft called `event_rollups_daily`.

### `first_win_metrics`
A view over `analytics_daily` for the activation question. Added in M5, superseded by `analytics_overview` in M7 and kept for continuity.

### `analytics_rollups`
`day` PK; `computed_at`; `rows_written`; `duration_ms`. Which days have been computed. A day absent here has no data; a day present with no counts genuinely had none. Staff select; written only by `rollup_day`.

### `learner_milestones`
`user_id` PK → auth.users (cascade); `first_completion_seconds` (written once); `converted_at`; `created_at`. Two per-person measurements. **The only policy is "the person reading it owns it"** — not staff, not the public. They were briefly columns on `profiles`, which would have exposed them through the public-profile and moderator policies; see D-079.

### Views added in M7
`analytics_overview` (one row per computed day, derived metrics only), `analytics_breakdown` (dimension breakdowns with groups below five withheld), `moderation_trends` (approval and quality from the catalogue itself), `first_win_timing` (median and ninetieth percentile; the one view that runs as its owner, with `app.is_staff()` guarding it from inside).

### `audit_log`
Append-only: `id` bigint; `actor_id` (**set null** on deletion — the earlier draft said "kept as opaque ID", which is not what the schema does); `action`; `target_type`; `target_id`; `diff` jsonb; `created_at`. Staff select; server-only insert; update and delete revoked and guarded by trigger, which permits exactly one change: the actor moving to null.

### Not created
`feature_flags` and `rate_limits` are **not in the database**. Flags are server-side configuration in `src/platform`, and rate limiting runs in the application layer with an in-process store. Both move to the database when a second instance exists; until then a table would imply a guarantee we do not have.

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

## A8. Server functions

Read from the built schema on 2026-11-14, not from intent. Everything here
exists and has tests. `app.*` functions are internal; the rest are callable
through the API layer by the roles named.

| Function | Does | Callable by |
|---|---|---|
| `app.handle_new_user()` trigger | Creates `profiles` (generated unique handle) and `preferences` | Auth insert |
| `app.current_user_id()`, `app.is_guest()`, `app.is_staff()` | The only place policies touch the auth provider | Policies |
| `app.last_authenticated_at()` | Reads the token's authentication record, for operations that need a recent sign-in | `delete_my_account` |
| `has_role(role)` | Role check for policies | Policies, server |
| `app.append_only_except_actor(col)` | Permits exactly one change on an append-only table: the named actor column moving to null | Erasure |
| `set_declared_topics`, `set_topic_level`, `reset_learned_preferences` | Preference memory | Authenticated incl. guests |
| `set_interaction(content_id, kind, value)` | Validated state change, affinity update, counters | Authenticated incl. guests |
| `record_impressions`, `start_feed_session`, `record_recommendations`, `end_feed_session` | Feed sessions and the recommendation log | Authenticated incl. guests |
| `record_event`, `forget_my_events` | Consent-gated measurement, and self-service deletion of it | Authenticated |
| `create_card`, `add_card_version`, `record_link_check` | Catalogue authoring; a card cannot publish with an unchecked link | Privileged client |
| `upsert_category`, `upsert_topic`, `set_category_archived`, `set_topic_archived` | Taxonomy | Admin |
| `submit_resource`, `resubmit_content` | A contribution enters as a draft; a rejected one can be corrected once as a new version | Authenticated |
| `report_content`, `resolve_report`, `moderate_content` | Reporting and moderation, each audited | Authenticated / moderator |
| `grant_role`, `revoke_role` | Role changes, audited | Admin |
| `merge_guest_into(guest, target)` | Moves a guest's work to an existing account, earliest timestamps win | Server, after verified sign-in |
| `export_my_data()` | JSON of everything held about the caller. **No argument**, so it cannot describe anyone else | The account itself |
| `delete_my_account(confirm)` | Deletes the account after a typed confirmation and a recent sign-in; anonymises what survives; audits with a digest | The account itself |
| `app.purge_stale_guests(interval, dry_run)` | Removes abandoned guest accounts. Reports by default; **not scheduled** | Privileged client only |
| `app.day_of(ts)` | The reporting day in UTC. One definition, used by every metric. Carries no `search_path` setting, deliberately, so the planner can inline it (D-073) | Everywhere |
| `app.suppression_threshold()` | Five. The floor below which a breakdown is withheld | Views |
| `record_first_completion_seconds(seconds)` | The browser's first-win timing, written once per account and only for someone who has completed something | The account itself |
| `rollup_day(day)` | Recomputes one day's derived metrics from the product tables. Idempotent | **Privileged client only** |
| `reconcile_day(day)` | Counts the product tables afresh and reports disagreement, with erasures since the rollup as the one legitimate cause of drift | **Privileged client only** |

`rollup_events(day)` from the Phase 1 draft became `rollup_day(day)`, above.
Planned and **not yet created**: `purge_rate_limits()`. Rate limiting currently runs
in the application layer.

## A9. Retention and deletion

The authoritative, column-by-column version is `VSHARES_DATA_INVENTORY.md`,
produced by querying the schema. This is the summary.

| Data | Retention | On account deletion |
|---|---|---|
| Profile, preferences, consent history, topics, interactions, sessions, recommendations | Life of account | Deleted (cascade) |
| Guest accounts | 30 days, measured against last activity — `VSHARES_GUEST_LIFECYCLE.md` | Deleted; **the job is implemented and deliberately not scheduled** |
| Submitted cards that were published | Until archived | Kept; `submitted_by` nulled |
| Pending / rejected submissions | 90 days after decision (proposed; not yet automated) | Deleted |
| `analytics_events` | 13 months (proposed; not yet automated) | `user_id` nulled |
| `analytics_daily`, `content_stats`, `analytics_rollups` | Indefinite — aggregates that never held an identifier | Unaffected. A historical figure is **not** rewritten when someone erases their account: it holds nothing about them, and rewriting it would lose a true record (D-077) |
| `learner_milestones` | Life of account | Deleted (cascade) |
| `audit_log`, `moderation_actions`, `content_versions`, `content_reports` | 24 months (proposed) | **Actor nulled.** Earlier drafts of this document said the actor was kept as an opaque id; it is not kept at all |

Periods marked proposed still need owner confirmation, and none of them is
enforced by a scheduled job yet.

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
