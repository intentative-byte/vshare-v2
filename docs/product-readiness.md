# VShare Product Readiness

## Working features

- Local-first onboarding for selecting interests.
- Supabase is optional; app routes load in local mode without runtime Supabase configuration.
- Feed, Explore, Saved, and Profile routes are present and mobile-first.
- VAI orchestration now exposes one product-facing user state for:
  - current goal
  - next milestone
  - next action
  - top constraint
  - governor command
  - daily mission
  - growth score
  - life alignment score
- Feed uses interests, knowledge/capability signals, goals, outcomes, governor state, and autonomous missions through the VAI orchestration layer.
- Profile has been simplified to the clearest product metrics:
  - Growth Score
  - Current Goal
  - Next Action
  - Top Constraint
  - Streak
  - Saved Items
- Health check is available at `GET /api/health`.
- Smoke tests cover homepage, login, onboarding, feed, explore, saved, profile, local/demo mode, health check, and VAI orchestration.

## Incomplete features

- Supabase-backed persistence and authentication are still intentionally disconnected.
- User state is stored locally in the browser; cross-device sync is not implemented.
- Content is still a curated local catalog plus user-created local contributions.
- External market data, job data, creator data, and community network data are modeled locally rather than fetched from live APIs.
- Evidence uploads are represented as local metadata; binary upload/storage is not implemented.

## Mock/demo features

- Intelligence outputs use deterministic local heuristics rather than trained VAI models.
- Collective intelligence is anonymized from local state, not a real multi-user aggregate.
- Market intelligence uses an internal static market graph.
- Notification framework creates notification intent objects only; no push, email, or in-app notification delivery exists.

## Risks

- The engine surface area is large and should be pruned as real user data reveals which signals matter.
- Browser local storage can be cleared and is not suitable for production persistence.
- Some scores may feel overly precise because they are heuristic-based.
- Profile simplicity must be preserved; deeper diagnostics should stay secondary or hidden behind future drill-down views.
- Build still warns that Next.js `middleware` should eventually migrate to `proxy`.

## Next priority

Reconnect persistence with a real backend schema for user state, goals, outcomes, saved items, and events. After persistence, validate which VAI orchestration signals actually improve activation, retention, and outcome completion.
