# Milestone 7 — visual evidence

Captured 2026-11-14 against a production build, at 412px (Pixel 7) and 1280px.

| File | What it shows |
|---|---|
| `charts-*.png` | The marks the measurement dashboard is built from: stat tiles, the daily column chart and ranked bars with a withheld row |

**The numbers in these images are made up.** Nobody has used VSHARES, so there
are no real figures to photograph. They describe no person and no activity, and
they are drawn in the development component gallery, which is never served in
production. The dashboard itself shows nothing at all until a day has been
computed — it says so rather than drawing zeros.

What the images are evidence of:

- The two chart colours on the real dark surface. They are not the interface gold
  and blue, which sit outside the lightness band a dark chart needs; these two
  were validated against all six checks before use.
- A single series takes no legend and labels only its peak.
- A withheld row keeps its place and says "withheld" rather than vanishing, so a
  reader can see that something is there.
- **"Not enough data" and "Not measured" are different statements**, and the tiles
  say which. The first means more data would fill it; the second means nothing
  collects it and nothing will. The first version of these tiles said "Not enough
  data" for applied learning, which invited the reader to wait for a number that
  is never coming. Corrected before capture.

Accessibility: `npm run check:gallery-a11y` runs axe over this page at both
viewports — **0 violations**. The gallery is not in the routine end-to-end
accessibility list on purpose: a production build answers 404 for it, and that
404 is itself a security check that turning dev tools on would defeat.

**The dashboard with real figures cannot be photographed here.** It needs a staff
account, which needs an auth service, and a computed rollup, which needs a
privileged client. Eight end-to-end checks cover it and are skipped;
`docs/VSHARES_LIVE_VERIFICATION.md` lists what clearing them requires.
