# VSHARES — Phase 10.3M: Multimedia Knowledge Engine & embedded learning feed

- **Date:** 2026-11-18 · **Branch:** `claude/gallant-mendel-xey567`
- **What this is:** a provider-independent, **embed-only** multimedia engine and
  an accessible, social-style learning feed prototype that displays authorised
  third-party educational videos alongside VSHARES knowledge cards — local-first
  and read-only. No remote DB write, no media download/rehosting, no automatic
  publishing, no RLS change, no live write test, no merge/deploy, no secret.

## 1. Audit
Reuses the existing content schema, VAI ranker, TAI, Content Factory and
moderation gates unchanged. The media engine sits alongside the factory in
`src/factory/media/`; it never writes to the database and only prepares
candidates for the existing human review/approval path.

## 2. Multimedia Knowledge Engine (`src/factory/media/`)
Provider-independent model (`VideoCandidate | ImageCard | TextCard`). Providers:
- **`providers.ts`** — validates YouTube/Vimeo URLs (allowlist only; https only;
  strict id formats), and builds **privacy-respecting embeds**:
  `youtube-nocookie.com` / Vimeo `dnt=1`, captions requested (`cc_load_policy`),
  **no autoplay**, **controls preserved** (never `controls=0`), attribution kept.
- **Nothing is downloaded or rehosted** — embeds only.

## 3. Multimedia feed (prototype)
`docs/samples/media/multimedia-feed.html` — a self-contained, mobile-first,
vertical **scroll-snap** feed (`role="feed"`) mixing **videos, an image card and
a text card**. Accessibility & conduct built in: provider players keep their own
controls; captions requested; **no autoplay** (so motion/data preferences are
respected and two videos never play at once); **pause-when-inactive** via the
provider JS API (IntersectionObserver + postMessage); **keyboard navigation**
(↑/↓); honoured `prefers-reduced-motion`; a **Data-Saver** notice; clear creator
attribution with a "Watch on YouTube" link to the original.

## 4. VAI + TAI
`rank.ts` maps a candidate into the **existing VAI ranker** and ranks by quality,
relevance, level fit, format preference, freshness and **source diversity**.
Platform stats are set to **zero** — the ranker is never told a view/like count,
so **popularity cannot stand in for educational quality**. TAI's trend layer
(Phase 10.3) can propose video *topics* from genuine observations without
treating popularity as quality.

## 5. Content verification
Every candidate carries: provider id, original URL, **creator/channel
attribution**, category, topic, educational objective, **embedding eligibility**,
licence where relevant, review status, and quality/safety assessment.
`verifyCandidate` rejects any candidate missing these. **No video is marked
fact-checked** by the engine — the quality note says so explicitly; a human
reviews the actual content before approval.

## 6. Editorial workflow
`runMediaPipeline` runs DISCOVER → VALIDATE → CLASSIFY → ASSESS → REVIEW and
stops at **in_review**. It **never approves, never publishes**, refuses any
attached writer (default-deny), and escalates high-impact topics to an
independent second reviewer. Approval remains a human running `moderate_content`
through the database gates.

## 7. Real demonstration (`docs/samples/media/`)
Live-verified via the public **YouTube oEmbed** endpoint (no API key), through
the egress proxy:

| Video | Channel (verified) | oEmbed |
|---|---|---|
| But what is a neural network? | 3Blue1Brown | **verified** |
| Why Black Holes Could Delete The Universe | Kurzgesagt – In a Nutshell | **verified** |
| The essence of calculus | 3Blue1Brown | **verified** |
| Grit: Passion and Perseverance | TED (Angela Lee Duckworth) | **verified** |
| Learn Python – Full Course for Beginners | freeCodeCamp.org | **verified** |

**5/5 verified** (existence, public, embeddable metadata, real title/channel).
The pipeline validated all five (0 rejected). The feed prototype interleaves
these with an NHS-sourced text card and a licensed-image placeholder card. A
"verified" oEmbed status is **not** a content fact-check — that is still the
human reviewer's job (stated in `media-verification.json`).

## 8. Testing (test-first, offline + gated live)
`tests/unit/factory/media.test.ts` (19 tests): provider URL validation,
embedding restrictions (privacy host, no autoplay, preserved controls, captions,
attribution), invalid-media rejection, candidate completeness, **no auto-approval
+ default-deny writes**, high-impact escalation, **popularity-is-not-quality**
ranking, oEmbed verdicts, and **prototype accessibility/safety** (role="feed",
titled iframes, keyboard nav, reduced-motion, pause-inactive, data-saver, no
autoplay). The live oEmbed demonstration is gated behind `FACTORY_LIVE=1` and
skipped in CI.

| Check | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm test` | **PASS — 289 passed, 2 skipped** (the live network tests), 22 files |
| `npm run test:e2e` | **PASS — 90 passed / 72 skipped / 0 failed** |
| `npm run build` | **PASS** |
| `npm run check:hygiene` | **PASS — 340 tracked files** |
| Live media demo (FACTORY_LIVE=1) | 5/5 videos verified via oEmbed |

## Known limitations
- oEmbed confirms existence/public/embeddable-metadata and real attribution; it
  is **not** a guarantee of embedding on every domain, nor a content fact-check.
- The image card uses a labelled placeholder (no licensed-image provider wired).
- The feed is a **prototype** (static HTML), not yet wired into the app routes —
  wiring needs published video content and so is owner-gated.
- Node `fetch` needs `--use-env-proxy` + `NODE_EXTRA_CA_CERTS` here.

## Next-stage recommendation (owner-gated)
1. Propose a `content_media` schema extension (provider, provider_id, channel,
   licence, embeddable) with cross-user RLS tests — additive, owner-approved.
2. Port the prototype into a real, tested React feed component behind the
   existing feed, reading only **approved** media.
3. Add a licensed-image provider and Vimeo verification.
4. Human review + approval of the 5 verified videos through `moderate_content`
   (the first multimedia publish), high-impact second review where relevant.

**Success criterion met:** a working, accessible, social-style multimedia
learning feed that displays authorised third-party educational videos (verified,
attributed, embed-only) alongside VSHARES knowledge cards — without compromising
educational quality (popularity never ranks), creator rights (attribution + full
provider controls, nothing downloaded) or security (read-only, no auto-publish).
**STOP for owner review.**
