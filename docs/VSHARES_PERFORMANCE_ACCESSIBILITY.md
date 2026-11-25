# VSHARES — Performance and accessibility (Milestone 8)

- Date: 2026-11-15
- Measured against a production build (`next build` then `next start`), with
  the preinstalled Chromium, at mobile (Pixel 7, 412px) and desktop (1280px).
- Where a number needs a real database or a live journey, it is reported as
  **blocked**, not estimated.

## 1. Front-end payload and rendering — measured

Transferred JavaScript and navigation timing, averaged over a few loads:

| Route | JS transferred | FCP | DOMContentLoaded | load |
|---|---|---|---|---|
| `/` (home) | 224–229 KB | ~0–108 ms | ~90–110 ms | ~140–166 ms |
| `/learn` | 224 KB | ~80 ms | ~55 ms | ~120 ms |
| `/you` | 120–134 KB | ~96 ms | ~80 ms | ~130 ms |

Largest shared chunks on disk: 224 KB, 165 KB, 110 KB, 105 KB; total client
chunk weight ~980 KB before compression, of which ~224 KB is loaded on a first
visit.

**Budget.** The informal budget set at M1 was ≤ 300 KB of JavaScript on a first
load. The measured first-load payload is ~224 KB, **within budget**. There is
no third-party script on any route (proven by `analytics.spec.ts`), so the
payload is entirely our own and the framework's.

### A real finding about DB-blocking routes

`/explore` measured **~7,100 ms** to first paint in this environment. The cause
is the measurement setup, not the code: the app was served with a placeholder
database host (`placeholder.example.com`) that is unreachable, and the Explore
page blocks its first render on `listCategories`, so it waits out a network
timeout before falling back to its unavailable state.

This is honest to report two ways:

- It is **not** a production number — against a reachable database the same
  query is sub-millisecond (measured in M4/M7), so the page would paint in the
  same ~100 ms range as the others.
- It **is** a real property worth noting: a route that blocks its first paint on
  a database read is as slow as that read's worst case. Against a healthy DB
  that is fine; against a degraded one it is a visible stall. The learner-facing
  budget check on a real populated environment (a release item) is where this
  gets a trustworthy number.

## 2. Database request latency — measured (M4, M7)

Already measured against representative datasets and recorded in the test
report:

- Feed candidate query: **0.60 ms** over 5,000 cards (M4).
- Analytics rollup, one day: **94 ms** over 80,000 interactions (M7).
- Slowest dashboard query: **34 ms** (M7).
- No learner-facing query reads an analytics table.

## 3. Accessibility — measured

| Check | Result |
|---|---|
| axe (WCAG 2.0/2.1 A & AA) on every core route, both viewports | **0 violations** (`accessibility.spec.ts`) |
| axe on the chart and admin components (component gallery) | **0 violations** (`npm run check:gallery-a11y`) |
| Keyboard alone reaches content and navigation | **Pass** (`accessibility.spec.ts`) |
| Accessible forms | Every input has a visible label, hints and errors are `aria-describedby`, errors set `aria-invalid` (the `TextField`, `TextArea`, `SelectField` primitives) |
| Error messages | Field errors are announced with the field; page-level errors use the `ErrorState` region |
| Colour contrast | Interface pairings measured in `VSHARES_DESIGN_SYSTEM.md` §2; chart colours validated against the dark surface (M7) |
| No horizontal scroll at 360/412px, 44px tap targets | **Pass** (`shell.spec.ts`) |

## 4. Network-failure recovery — partially measured

- An **unconfigured or unreachable backend** renders a visible unavailable state
  and `/api/ready` reports not-ready, rather than showing placeholder data
  (D-036, tested in `shell.spec.ts`). The 7-second `/explore` stall above is
  exactly this path firing on a timeout.
- A **failed mutation** (a server action returning a failure envelope) is shown
  to the user inline, with the field or message, and never as a crash — the
  uniform `Result` envelope. Covered by unit tests of the pipeline and by the
  component error handling.
- **Recovery from a mid-journey network drop** on a real journey (lose
  connection during a feed session, reconnect) needs a live service to exercise
  and is on the verification checklist.

## 5. Blocked — needs a live service or a populated app

| Measurement | Why blocked |
|---|---|
| Core Web Vitals (LCP, CLS, INP) on real content | Needs a populated, deployed app. The shell numbers above are the measurable part; LCP on a real card page needs real cards |
| Lighthouse on the first card journey | Needs published cards, which need link checking (blocked on network) and a database |
| Feed responsiveness under real data from the browser | Needs a live feed with a catalogue |
| The 60-second first-win benchmark | Needs the whole journey against a service — see §10 of the directive and the release dashboard |
| Manual screen-reader pass | Needs a person; axe is automated coverage, not a substitute |

## 6. Summary

What is measured passes: the first-load JavaScript is within budget, the shell
renders in ~100–170 ms, database queries are fast, and accessibility is 0 axe
violations across every route and component with working keyboard navigation.
What is blocked is blocked on the same live service the rest of Milestone 8
needs, and is listed as such rather than guessed at.
