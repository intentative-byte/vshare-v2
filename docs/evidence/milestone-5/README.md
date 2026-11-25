# Milestone 5 — visual evidence

Captured 2026-11-14 against a production build.

| File | What it shows |
|---|---|
| `home-*.png` | The home page: the promise, and eight topics that lead straight to a first card |
| `saved-*.png` | The saved library |
| `path-*.png` | The Path tab |
| `you-*.png` | The You tab |

**How these were captured, and what is missing.** This environment has no
database, so the application was started with placeholder configuration to
make the pages render their normal layout rather than the unavailable state.
Nothing was signed in and no request reached a service.

The screens that need content — the first learning win itself, a value
session, a populated library, a filled progress dashboard — **cannot be
photographed here**. Thirty-six end-to-end tests cover them and are skipped
for want of a service; `docs/VSHARES_SUPABASE_SETUP.md` gives the steps to
clear that, after which `scripts/capture-screenshots.mjs` will photograph the
real journey.
