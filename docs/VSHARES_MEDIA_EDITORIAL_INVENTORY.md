# VSHARES — multimedia editorial review inventory

- **Date:** 2026-11-18 · Candidates prepared for **human** review. None is
  approved or published; approval happens via `moderate_content` through the
  database gates, with an independent second reviewer for high-impact topics.
- **Attribution** and **embed eligibility** were confirmed live via the public
  YouTube oEmbed endpoint (no API key); see `docs/samples/media/media-verification.json`.
- **Factual verification:** NOT DONE by the engine. oEmbed confirms the video
  exists, is public and embeddable and gives the real title/channel — it does
  **not** check the educational content. A human must watch and verify before
  approval.

| # | Video (objective) | Creator (verified) | Original source | Embed eligible | Quality assessment | Factual status | Moderation decision required |
|---|---|---|---|---|---|---|---|
| 1 | **But what is a neural network?** — see, visually, what a neural network is and how it represents a function | 3Blue1Brown (oEmbed ✓) | https://www.youtube.com/watch?v=aircAruvnKk | yes (nocookie embed) | editorial, captions available; not view-count based | **NOT fact-checked** — human review of content | Approve/reject; confirm level (intermediate) |
| 2 | **Why Black Holes Could Delete The Universe** — understand the information paradox and why it matters | Kurzgesagt – In a Nutshell (oEmbed ✓) | https://www.youtube.com/watch?v=yWO-cvGETRQ | yes | editorial; engaging but check scientific framing | **NOT fact-checked** | Approve/reject; verify it is not sensationalised |
| 3 | **The essence of calculus** — build intuition before the mechanics | 3Blue1Brown (oEmbed ✓) | https://www.youtube.com/watch?v=WUvTyaaNkzM | yes | editorial; strong conceptual pedagogy | **NOT fact-checked** | Approve/reject |
| 4 | **Grit: Passion and Perseverance** — what 'grit' is and the evidence it predicts achievement | TED — Angela Lee Duckworth (oEmbed ✓) | https://www.youtube.com/watch?v=H14bBuluwB8 | yes | editorial; note the research has been debated — reviewer should frame honestly | **NOT fact-checked** | Approve/reject; consider a balancing note on the evidence |
| 5 | **Learn Python – Full Course for Beginners** — a complete beginner's intro to programming | freeCodeCamp.org (oEmbed ✓) | https://www.youtube.com/watch?v=rfscVS0vtbw | yes | editorial; long-form, high practical value | **NOT fact-checked** | Approve/reject; confirm duration/level |

**High-impact:** none of these five are in a high-impact category, so no
second-reviewer is forced; a reviewer may still flag one. The pipeline validated
all five (`runMediaPipeline`: 5 validated, 0 rejected, 0 requiring a second
reviewer).

**What approval requires (per video):** a human watches the content; confirms the
educational objective is met; confirms attribution and that embedding is allowed
on our domain; sets category/topic/level; records a factual-verification note;
then `moderate_content('approve')` — which writes to `content_media` only via the
server/moderation path (the table is server-write-only). No automatic approval.
