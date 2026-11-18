# Milestone 6 — visual evidence

Captured 2026-11-14 against a production build, at 412px (Pixel 7) and 1280px.

| File | What it shows |
|---|---|
| `submit-form-*.png` | The submission form with the approved taxonomy: the link, the publisher, a title in the submitter's own words, why it is worth someone's time, and the topic |
| `data-rights-*.png` | `/you/data`: take a copy, and delete your account |
| `submissions-*.png` | `/you/submissions` |
| `you-*.png` | The You tab, now carrying Contribute and Your data |

**How these were captured, and what is missing.** This environment has no
auth service, so the application was started with placeholder configuration.
Nothing was signed in and no request reached a service.

The submission form is photographed in the component gallery (`/dev/ui`),
which is development-only, because `/you/submit` needs an account and a
database to list topics. The form shown is the same component the route
renders, given the same approved taxonomy.

What **cannot** be photographed here: a submission with a real status, a
moderator's feedback, a correction, an export file, the deletion
confirmation after a real sign-in, and the share sheet. Ten end-to-end tests
cover those and are skipped for want of a service. `docs/VSHARES_SUPABASE_SETUP.md`
gives the steps to clear that.

The full-page captures show the fixed tab bar drawn across the page; that is
an artefact of a full-page screenshot. Scrolled to the bottom at 412px, the
last control sits clear of the bar, which was checked rather than assumed.
