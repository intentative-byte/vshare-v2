# VSHARES — Gate 2: multimedia editorial verification

- **Date:** 2026-11-18 · Editorial verification of the five candidate videos.
  **No remote write, no publication, no automatic approval.** Migration 9 is
  confirmed applied to the dev project by the owner.

## Task 1 — remote read-only verification
- Owner confirms migration 9 (`content_media`) is applied; remote migration
  history matches all nine local migrations.
- **From this session, `content_media` cannot be read remotely** (no anon key in
  this environment; a keyless `GET /rest/v1/content_media` returns **HTTP 401** —
  the gateway is alive but requires the key). The owner can confirm the table,
  RLS and policies with the read-only SQL in `VSHARES_GATE1_EXECUTION_PLAN.md`.
- All five videos were **re-confirmed embeddable** via live YouTube oEmbed with
  correct creator attribution (below).

## Task 2 — important caveat on content review
**This agent cannot watch video content.** Identity, creator, source and current
embedding were verified via oEmbed; the *substantive topic claims* were checked
against independent sources. But the **actual spoken/visual content of each video
was NOT reviewed**, so every video is marked **FACT-CHECK INCOMPLETE** at the
content level. oEmbed metadata is **not** substituted for fact-checking. A human
must watch each video before approval.

## Five-video editorial assessment

### 1. "But what is a neural network?" — 3Blue1Brown (`aircAruvnKk`)
- Source: `https://www.youtube.com/watch?v=aircAruvnKk` · Embedding: **verified**.
- Objective: visual intuition for what a neural network is.
- Content review: **FACT-CHECK INCOMPLETE** (not watched). Topic is foundational
  and the creator is highly regarded; no topic-level red flag.
- Safety/usefulness: high usefulness, no safety concern.
- **Decision: VERIFICATION BLOCKED** — agent cannot complete the content
  fact-check; **human viewing required**. Topic-sound → likely READY after viewing.

### 2. "Why Black Holes Could Delete The Universe" — Kurzgesagt (`yWO-cvGETRQ`)
- Source verified; embedding **verified**.
- Objective: understand the black-hole information paradox.
- Content: **FACT-CHECK INCOMPLETE** (not watched). **Claim-level evidence:** the
  information paradox is **still unresolved** — no accepted solution; active
  proposals (gravitational-wave signatures, "islands", remnants) remain untested.
  The video (2015) is a popular-science simplification of an **open** problem.
- **Decision: REVISION REQUIRED** — a reviewer must confirm it is framed as an
  open question (the title's "Could" is appropriate) and add an objective/note
  that the paradox remains unresolved; do not present any resolution as settled.

### 3. "The essence of calculus" — 3Blue1Brown (`WUvTyaaNkzM`)
- Source verified; embedding **verified**.
- Objective: build intuition for calculus before the mechanics.
- Content: **FACT-CHECK INCOMPLETE** (not watched). Foundational; no red flag.
- **Decision: VERIFICATION BLOCKED** — human viewing required; likely READY after.

### 4. "Grit: The Power of Passion and Perseverance" — TED, Angela Lee Duckworth (`H14bBuluwB8`)
- Source verified; embedding **verified**.
- Objective: understand "grit" and the evidence it predicts achievement.
- Content: **FACT-CHECK INCOMPLETE** (not watched). **Claim-level evidence:** the
  grit construct is **real but modest and overlaps heavily with conscientiousness**
  — the key critique is Credé, Tynan & Harms (2017) *"Much Ado About Grit"* (JPSP,
  meta-analysis of ~88 studies); most predictive value sits in the
  perseverance-of-effort facet, and predictive power beyond conscientiousness is
  small. The talk's strong framing is **academically contested**.
- **Decision: REVISION REQUIRED** — pair with a balancing note on the debated
  evidence; do not present grit as a settled strong predictor of success.

### 5. "Learn Python – Full Course for Beginners" — freeCodeCamp.org (`rfscVS0vtbw`)
- Source verified; embedding **verified**.
- Objective: a complete beginner's introduction to Python.
- Content: **FACT-CHECK INCOMPLETE** (not watched); long-form tutorial — confirm
  currency (Python 3 fundamentals are stable) and the duration/level metadata.
- **Decision: VERIFICATION BLOCKED** — human viewing required; likely READY after.

### Summary
| Video | Embedding | Content fact-check | Decision |
|---|---|---|---|
| 3Blue1Brown — neural network | verified | INCOMPLETE (not watched) | **VERIFICATION BLOCKED** |
| Kurzgesagt — black holes | verified | INCOMPLETE; topic is an open problem | **REVISION REQUIRED** |
| 3Blue1Brown — calculus | verified | INCOMPLETE (not watched) | **VERIFICATION BLOCKED** |
| TED — Grit | verified | INCOMPLETE; claims academically contested | **REVISION REQUIRED** |
| freeCodeCamp — Python | verified | INCOMPLETE (not watched) | **VERIFICATION BLOCKED** |

**0 READY, 2 REVISION REQUIRED, 0 REJECTED, 3 VERIFICATION BLOCKED.** No video is
approvable on current evidence: three need a human to watch them, and two need an
editorial framing/balancing note first.

## Task 4 — publication readiness (no insert performed)

**Blocker (parent-card eligibility):** `content_media` RLS exposes a published
row only when `app.can_read_content(parent content_id)` is true — i.e. the parent
**card is published**. The catalogue currently has **0 published cards** (the ten
seeded cards are drafts with no link check). **So there is no eligible published
parent card to attach approved media to.** A parent card must be published first
(its own gate: link-check + moderation), or a suitable host card chosen.

**Independent review:** none of the five topics is in a high-impact category, so
no second reviewer is forced — but the two REVISION-REQUIRED items need their
note before approval, and any reviewer may still escalate.

**Owner-authorised insert pathway (server-write-only; do NOT run here):** media is
inserted by the **service role** (SQL editor or an owner-run script), never by a
client. Template, per approved video:
```sql
-- Preconditions: the parent card is PUBLISHED; a human watched & approved the
-- video; REVISION items carry their note; reviewer uuid is a real moderator.
insert into public.content_media
  (content_id, provider, provider_id, original_url, media_type, channel,
   channel_url, title, objective, licence, embeddable, captions_available,
   status, reviewed_by, reviewed_at)
values
  (:published_card_id, 'youtube', :video_id, :original_url, 'video', :channel,
   :channel_url, :title, :objective, 'standard-youtube-terms', true, true,
   'published', :reviewer_uuid, now());
```
After insert, confirm an anonymous client sees exactly the approved rows and
`/learn` renders them under the published parent card.

## Remaining blockers
1. **No published parent card** → approved media cannot be publicly visible yet.
2. **Content fact-check requires a human** → 3 videos VERIFICATION BLOCKED.
3. **Two videos need an editorial note** before approval (black-hole framing;
   grit balancing note).
4. This session cannot read the remote `content_media` (no key) — owner verifies.

## Exact publication-approval requirements (per video)
- [ ] A human has **watched** the video and confirmed the objective and accuracy.
- [ ] Attribution and embedding confirmed (done via oEmbed; re-confirm at publish).
- [ ] For REVISION items, the framing/balancing note is written into `objective`.
- [ ] A **published parent card** exists for the media's `content_id`.
- [ ] High-impact → an **independent second reviewer** (N/A for these five).
- [ ] Insert via the **service-role pathway** only; verify visibility afterwards.

## Next recommended step
Resolve the parent-card blocker first: **link-check and publish at least one
suitable host card** (a separate, owner-approved content gate), and have a human
**watch the three VERIFICATION-BLOCKED videos** and **add the two editorial
notes**. Then publish the approved media via the server-side pathway and verify.

## Sources (claim-level evidence)
- Grit critique: Credé, Tynan & Harms (2017) "Much Ado About Grit" — summarised at
  [KNKX](https://www.knkx.org/youth-education/2016-05-25/macarthur-genius-angela-duckworth-responds-to-a-new-critique-of-grit)
  and [Atticus Li](https://atticusli.com/replication-crisis/grit-oversold/).
- Black-hole information paradox still open:
  [Big Think](https://bigthink.com/starts-with-a-bang/black-hole-information-paradox-solved/),
  [Scientific American](https://www.scientificamerican.com/article/does-information-ever-really-disappear-physics-has-an-answer/),
  [phys.org](https://phys.org/news/2024-12-quantum-black-hole-paradox.html).
