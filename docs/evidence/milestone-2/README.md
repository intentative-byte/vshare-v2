# Milestone 2 — visual evidence

Captured 2026-11-14 against a production build.

| File | What it shows |
|---|---|
| `sign-in-*.png` | The sign-in form |
| `you-signed-out-*.png` | The You tab for a visitor with no account |

**How these were captured.** This environment has no auth service, so the
application was started with placeholder configuration values. That makes the
pages render their normal layout instead of the "unavailable" state. Nothing
was signed in, no request reached an auth service, and no screenshot here
shows a working sign-in: these are evidence of design, not of function.

The genuine unavailable state, which is what this instance really serves, is
covered by the end-to-end suite.
