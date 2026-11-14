# Milestone 4 — visual evidence

Captured 2026-11-14 against a production build.

**What is and is not here.** The value session interface cannot be
photographed from this environment: rendering a session needs a catalogue,
and no database service is reachable here. These screenshots show the Learn
and Explore shells reporting that honestly, which is what this instance
really serves.

The evidence for the feed itself is in two other forms, both verifiable:

- `docs/VSHARES_TEST_REPORT.md` — the worked example, showing the ranking and
  the reason given for each of the ten batch-1 cards across several learner
  profiles. It is a test, so it cannot drift from the code.
- `npx vitest run tests/unit/worked-example.test.ts` — run it yourself.

Once a database is configured, `npm run test:e2e` runs eight further checks
against the rendered session, and `scripts/capture-screenshots.mjs` will
photograph it.
