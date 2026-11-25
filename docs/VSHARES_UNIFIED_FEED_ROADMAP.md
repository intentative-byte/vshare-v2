# VSHARES — unified learning-feed architecture (roadmap)

- **Status:** design only. No code or migration here; this is separate from
  activation (`VSHARES_MEDIA_ACTIVATION_PROCEDURE.md`). It describes how original
  cards, approved videos and licensed images become **one** VAI-ranked learning
  experience without compromising the product promise ("value scrolling", a
  finite session, no engagement manipulation).

## Goal
One session mixes text cards, embedded educational videos and licensed images,
ranked by a **single** VAI pass on **educational value** — never popularity —
ending with a clear stopping point as today.

## Where things stand
- **Cards:** `content_items`/`content_versions`, ranked by the VAI ranker, assembled
  into a finite session (`feed` module).
- **Media:** `content_media` (migration 9, local), read by `listApprovedMedia`,
  rendered as a separate `MediaFeed` section under the value session. Media is
  mapped into the ranker with platform stats zeroed.
- **Gap:** cards and media are two sections, ranked and assembled separately.

## Target architecture — one ranked session
1. **A common candidate shape.** Introduce a `FeedCandidate` union
   (`card | video | image`) that all three map into, each already expressible as
   the ranker's `Candidate` (topic, quality, level, format, source). Media uses
   `format` = `video`/`image` for the existing `formatFit` signal; stats stay
   zero so views never rank.
2. **One ranking pass.** `rankCandidates` over the merged pool, so a strong video
   can outrank a weak card on the same topic and vice versa — purely on quality,
   relevance, level fit, format preference and freshness.
3. **Diversity across media types.** Extend session assembly's existing
   per-source and per-topic caps with a **per-format** cap (e.g. no more than N
   videos in a row), so a session is a genuine mix, not a video wall. Keep the
   discovery slot.
4. **One finite session.** The assembled session still ends with a summary and
   does not refill — media does not change the "finite, no doomscrolling" rule.
5. **Shared interaction model.** Opening/completing/saving a video or image
   records the same `content_interactions` events as a card, so progress,
   adaptive affinity and the session review work uniformly (a video completion is
   a completion; viewing is not).
6. **Governance unchanged.** Only approved, published, embeddable media enters the
   pool (RLS); nothing is downloaded; attribution and provider controls are
   preserved; high-impact review stands.

## Sequencing (each step owner-gated, test-first)
- **A. Candidate unification (local):** the `FeedCandidate` union + mappers +
  unit tests, behind the existing section rendering (no behaviour change yet).
- **B. Single-pass ranking (local):** merge cards + approved media into one
  `rankCandidates` call; prove ordering and the per-format cap with tests; keep
  the finite-session guarantees.
- **C. Interaction parity (schema review):** confirm `content_interactions`
  covers media (it references content; media rows have a `content_id`), or
  propose an additive link — reviewed like migration 9, not applied remotely.
- **D. Activation:** only after approved media exists (the activation procedure),
  switch `/learn` from the separate section to the unified session behind a flag,
  verify in dev, then decide.

## Risks & guardrails
- **Popularity creep:** keep media stats zeroed and never add a view/like signal
  to the ranker.
- **Video-heavy sessions:** the per-format cap and the finite length prevent a
  scrolling-video experience.
- **Third-party requests:** players load lazily and only when placed; no media
  request happens for a card-only session.
- **Accessibility:** the unified feed reuses the axe-clean `MediaFeed`
  primitives; every new layout re-runs the gallery accessibility check.

## Out of scope here
Creator uploads, quizzes/lessons in the session, and any production rollout —
those remain later-phase, owner-gated items.
