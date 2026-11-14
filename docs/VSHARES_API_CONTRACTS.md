# VSHARES — API Contracts (MVP)

- Version: 1.0 (design) · Date: 2026-11-14
- The browser never talks to the database. It calls **server actions** (mutations and personalised reads from client components) or loads **server-rendered pages**. A small number of **route handlers** exist for things that must be plain HTTP.
- Every contract below is a Zod schema in the owning module's `schemas.ts`; the TypeScript types are inferred from it. This document is the human-readable index; the schemas are the source of truth once written.

## 1. Common rules

**Result envelope** for every server action:

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fields?: Record<string, string> } };

type ErrorCode =
  | "UNAUTHENTICATED"   // no session
  | "FORBIDDEN"         // session lacks permission (incl. guest-only restrictions)
  | "VALIDATION"        // input failed schema; `fields` lists per-field messages
  | "NOT_FOUND"
  | "CONFLICT"          // duplicate handle, duplicate source URL, etc.
  | "RATE_LIMITED"      // includes retryAfterSeconds in message metadata
  | "UNAVAILABLE";      // dependency failure; safe to retry
```

- `message` is safe to show to users. Internal errors are logged with a request ID and returned as `UNAVAILABLE`.
- Unknown input fields are rejected (`.strict()`).
- IDs are UUIDs; slugs match `^[a-z0-9-]{3,80}$`.
- Mutations are idempotent where the table says so: repeating the call leaves the same state and returns `ok`.
- Pagination: cursor-based (`cursor` opaque string, `limit` ≤ 50) returning `{ items, nextCursor }`.
- Access column: **P** public, **G** guest or user, **U** registered user only, **M** moderator or admin, **A** admin.

## 2. Route handlers (HTTP)

| Method and path | Access | Request | Response | Notes |
|---|---|---|---|---|
| `GET /api/health` | P | — | `200 {status:"ok"}` | Liveness; no dependencies |
| `GET /api/ready` | P | — | `200 {status:"ready"}` or `503` | Database reachable, expected migration present; no details leaked |
| `POST /api/events` | P | `{ sessionId: uuid, events: ClientEvent[] }` (≤ 20) | `204` | Beacon for `card_impression`, `card_opened`, `source_clicked`, `session_started`, `search_performed`. Vocabulary-checked; rate-limited per session and IP hash; dropped silently when consent is denied |
| `GET /auth/callback` | P | `code`, `next?` | `302` | Exchanges the code; `next` must be a same-site relative path; failures redirect to `/sign-in?error=…` |
| `GET /you/data/export` | U | — | `200 application/json` attachment | Full export; rate-limited (3/day) |

## 3. Server actions

### `profiles`

| Action | Access | Input | Output | Rate limit |
|---|---|---|---|---|
| `requestMagicLink` | P | `{ email, next? }` | `{ sent: true }` — identical response whether or not the address is known | 3 / 15 min per email; 10 / hour per IP |
| `startGoogleSignIn` | P | `{ next? }` | `{ url }` | 20 / hour per IP |
| `signOut` | G | `{ everywhere?: boolean }` | `{}` | — |
| `getMyProfile` | G | — | `Profile` | — |
| `updateProfile` | U | `{ handle?, displayName?, isPublic? }` — partial; omitted fields unchanged | `Profile` | 10 / hour |
| `setAvatar` | U | image file ≤ 2 MB, png/jpeg/webp, re-encoded server-side | `Profile` | 5 / hour |
| `requestEmailChange` | U | `{ email }` | `{ sent: true }` | 3 / day |
| `deleteAccount` | U | `{ confirm: "DELETE" }` | `{}` then sign-out | 3 / day |

`Profile = { handle, displayName, avatarUrl, isPublic, isGuest, roles: ("moderator"|"admin")[] }`

### `personalisation`

| Action | Access | Input | Output |
|---|---|---|---|
| `getPreferenceMemory` | G | — | `{ personalisationEnabled, sessionMinutes, analyticsConsent, topics: { topicId, name, declared, affinity, level, levelOverridden }[] }` |
| `setTopics` | G | `{ topicIds: uuid[] }` (1–12) | updated memory |
| `setTopicLevel` | G | `{ topicId, level }` | updated memory |
| `resetLearnedPreferences` | G | `{ scope: "affinities" \| "hidden" \| "all" }` | updated memory |
| `updatePreferences` | G | `{ personalisationEnabled?, sessionMinutes?, analyticsConsent? }` | updated memory |

### `content`

| Read (server-rendered) | Access | Returns |
|---|---|---|
| `listCategoriesWithTopics()` | P | categories → topics, non-archived, ordered |
| `getCard(slug)` | P | `Card` if published, else not found |
| `listCardsByTopic(topicSlug, cursor)` | P | page of `CardSummary` |
| `searchCards(query, cursor)` | P | page of `CardSummary`; query 2–80 chars |

| Action | Access | Input | Output | Rate limit |
|---|---|---|---|---|
| `submitResource` | U | `{ url, title, summary, takeaways: string[1..3], topicId, format, estimatedMinutes, level }` | `{ id, status: "pending" }` | 5 / day |
| `listMySubmissions` | U | `{ cursor? }` | page of `{ id, title, status, rejectionReason?, createdAt }` | — |
| `reportCard` | U | `{ contentId, reason, note? }` | `{}` | 10 / day |

URL rules for `submitResource`: `https` only; hostname must resolve to a public address (no localhost, private ranges, or raw IPs); tracking parameters stripped; normalised form checked for duplicates (`CONFLICT` with the existing card's slug). The server does not fetch the URL in the MVP.

`Card = { id, slug, title, summary, takeaways, source: { url, name, author? }, format, estimatedMinutes, level, topic: { slug, name }, isAiAssisted, isHighImpact, publishedAt }`

### `feed` and `vai`

| Action | Access | Input | Output |
|---|---|---|---|
| `getFeedSession` | P (guests and visitors get the non-personalised mode) | `{ topicSlug?, sessionId }` | `{ sessionId, cards: FeedCard[], closing: ClosingCard }` |
| `getFirstWinCard` | P | `{ topicSlug }` | `FeedCard` |
| `getNextBest` | G | — | `{ card: CardSummary, rule, reason } \| { rule: "pick_topic" }` |
| `explainRecommendation` | G | `{ contentId, sessionId }` | `{ reasons: string[] }` |

`FeedCard = Card & { position, isDiscovery, state: { saved, liked, completed } }` — score internals are not sent to the client; reasons are fetched on demand.
`ClosingCard = { completedThisSession, minutesThisSession, nextBest? }`

### `progress`

| Action | Access | Input | Output | Idempotent |
|---|---|---|---|---|
| `completeCard` | G | `{ contentId, sessionId? }` | `{ state, win: { completedCount, followUp?: CardSummary } }` | yes |
| `setSaved` | G | `{ contentId, saved: boolean }` | `{ state }` | yes |
| `setLiked` | G | `{ contentId, liked: boolean }` | `{ state }` | yes |
| `skipCard` | G | `{ contentId, undo?: boolean }` | `{ state }` | yes |
| `setFeedback` | G | `{ contentId, feedback: "useful" \| "not_useful" \| null }` | `{ state }` | yes |
| `listSaved` | G | `{ topicSlug?, cursor? }` | page of `CardSummary` | — |
| `listCompleted` | G | `{ cursor? }` | page of `CardSummary & { completedAt }` | — |
| `getProgressSummary` | G | — | `{ week: Summary, allTime: Summary }` | — |

`Summary = { completed, minutes, topics, activeDays }` — derived only from completion records.
Guest writes create the anonymous account on first use; combined rate limit 120 interactions / hour per user.

### `admin`

All actions re-check the role server-side and are written to `audit_log`.

| Action | Access | Input | Output |
|---|---|---|---|
| `listModerationQueue` | M | `{ status?: "pending", cursor? }` | page of submissions with submitter handle |
| `moderateContent` | M | `{ contentId, action: "approve" \| "reject" \| "edit" \| "archive" \| "restore", fields?, reason? }` — `reason` required for reject and archive; approving a high-impact card requires a moderator other than the submitter | `Card` |
| `createCard` / `updateCard` | M | card fields incl. `qualityScore`, `isAiAssisted`, `isHighImpact`, secondary topics | `Card` |
| `listReports` / `resolveReport` | M | `{ reportId, outcome: "actioned" \| "dismissed", note? }` | `{}` |
| `upsertCategory` / `upsertTopic` / `archive…` / `reorder…` | A | taxonomy fields | updated entity |
| `listUsers` | A | `{ query?, cursor? }` | page of `{ userId, handle, roles, createdAt }` — no emails in list views |
| `grantRole` / `revokeRole` | A | `{ userId, role }` — cannot remove the last admin | `{}` |
| `setFeatureFlag` | A | `{ key, enabled }` | flag |
| `activateRankingConfig` | A | `{ weights, params, note }` → new version | config |
| `getFunnelReport` | M | `{ from, to, dimension: "topic" \| "card" \| "source" \| "device" }` | funnel counts and rates |
| `getValidationMetrics` | M | `{ from, to }` | the MVP validation metrics (spec §B1) |
| `listAuditLog` | A | `{ cursor?, actorId?, action? }` | page of entries |

## 4. Future contracts (reserved names, not implemented)

`learning.enrol`, `learning.getNextStep`, `learning.submitQuizAttempt` (graded server-side; answer keys never sent to clients), `progress.logAppliedAction`, `vai.getNextBestMove`, `vai.askMentor`, `creators.submitDraft`, `creators.getStats`. Each will be specified in this document before implementation.
