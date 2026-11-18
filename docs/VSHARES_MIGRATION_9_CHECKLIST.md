# Migration 9 (`content_media`) — readiness review & owner-approval checklist

- **File:** `supabase/migrations/20261118120000_content_media.sql`
- **Status:** local only. **Not applied to any remote database.** This document
  is the review and the exact checklist for the owner to apply it to the remote
  development project — it does not apply anything.

## Readiness review

| Area | Finding |
|---|---|
| **Least-privilege grants** | Only `grant select on public.content_media to anon, authenticated`. **No insert/update/delete grant.** Writes are possible only by the service role (bypasses RLS) or a SECURITY DEFINER function — i.e. the moderation path. ✔ |
| **RLS correctness** | RLS enabled. `select_published` = `status='published' AND app.can_read_content(content_id)`; `select_staff` = `app.is_staff()`; **no write policy** → server-write-only. ✔ (proven by `270_content_media.sql`) |
| **Parent-content visibility** | `app.can_read_content(content_id)` gates by the parent card's readability, so published media on a draft/hidden card is not exposed. ✔ (tested) |
| **Indexes** | `content_media_content_idx (content_id)`, `content_media_status_idx (status)`. ✔ |
| **Constraints** | `unique(provider, provider_id)`, `unique(original_url)`, `content_media_published_needs_review` (published ⇒ reviewed + embeddable), provider_id format, https URL, length checks, objective length. ✔ |
| **Rollback** | Additive. Reverse with `drop table public.content_media; drop type public.media_provider;`. No existing table or policy is altered, so rollback is clean and loses no other data. ✔ |
| **Compatibility** | Purely additive. The app already handles the table being absent (`listApprovedMedia` returns `[]`), so applying it is backward-compatible and does not change `/learn` until media is published. ✔ |
| **Ordering** | Timestamp `20261118120000` is after migration 8 (`20261117120000`), so it applies last, after `content_items`, `app.can_read_content` and `app.is_staff` exist. ✔ |

## Owner-approval checklist (apply to the remote DEV project only)

1. [ ] Confirm migrations **1–8 are already applied** on the dev project
   (`supabase migration list` or the dashboard).
2. [ ] Read the migration SQL in full: `supabase/migrations/20261118120000_content_media.sql`.
3. [ ] Confirm no secrets and no destructive statements (there are none — it only
   `create type` / `create table` / `create policy` / `grant select`).
4. [ ] From Windows Git Bash, in the repo: `supabase db push` (applies migration 9).
5. [ ] Verify after apply:
   - [ ] `content_media` exists and **RLS is enabled**.
   - [ ] Grants: `select` to `anon, authenticated` only — no write grant.
   - [ ] Policies `content_media_select_published` and `content_media_select_staff` exist.
   - [ ] A direct anonymous `select` returns **0 rows** (nothing published yet).
6. [ ] No data migration is required — the table starts empty.
7. [ ] Note: media stays invisible to the public until a moderator **publishes**
   a row through the moderation path (server-write-only). Applying the migration
   publishes nothing.

**Rollback (if ever needed):** `drop table public.content_media; drop type public.media_provider;`

**This phase does not apply the migration.** Application is an explicit,
owner-authorised step.
