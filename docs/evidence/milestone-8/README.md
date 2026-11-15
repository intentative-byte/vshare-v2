# Milestone 8 — visual evidence

Captured 2026-11-15 against a production build, at 412px (Pixel 7) and 1280px.

| File | What it shows |
|---|---|
| `admin-*.png` | The admin catalogue and taxonomy interface: category management (with high-impact badge, archive controls, topic counts) and the new-card form (with the draft-and-review safeguard notice) |

**The data in these images is mock data.** The real admin pages live under
`/admin` and need a staff account, which needs an auth service that does not
exist in this environment. So the components are drawn in the development
component gallery (`/dev/ui`, never served in production) with clearly-labelled
mock categories, topics and an empty card form. Nothing here can save, because
there is no session.

What the images are evidence of:

- The catalogue and taxonomy management **layout and controls** at both widths.
- The high-impact badge on a category, which is what makes its cards require a
  second reviewer.
- Archive controls present on every category and topic.
- The new-card form's safeguard notice: *"It will be created as a draft. Its
  link must be checked by the verifier and it must be reviewed before it can be
  published — this form cannot shortcut either step."*

Accessibility: `npm run check:gallery-a11y` runs axe over this page (now
including the admin components) at both viewports — **0 violations**.

**The admin pages with a real staff session cannot be photographed here.** Five
end-to-end journeys cover them (`admin-live.spec.ts`) and are skipped for want
of a service; the database layer behind them passes in
`supabase/tests/cases/230_admin_access.sql`. `docs/VSHARES_LIVE_VERIFICATION.md`
lists what clearing them requires.
