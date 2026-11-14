# VSHARES — Metrics dictionary

- Date: 2026-11-14 · Milestone 7
- Every number VSHARES reports is defined here. The same definitions and the same
  limits appear beside the number in the admin dashboard, generated from
  `src/modules/analytics/metrics.ts`, so a figure and its meaning cannot drift apart.

## 1. The two kinds of number

| Kind | How it is produced | Can it be trusted? |
|---|---|---|
| **Derived** | Recomputed from the product tables by `rollup_day(day)` | Yes. One completion is one row, so repeating an action or replaying an event cannot move it. Re-running the rollup gives the same answer |
| **Reported** | Counted as the browser said it | No. Nothing stops a browser saying something twice. Rate limited, labelled everywhere, and never a denominator for a rate that matters |

Both are stored in `analytics_daily`, in the same shape, with a `source` column
saying which. They are never added together.

**Everything the dashboard leads with is derived.** The reported events survive
because a browser is the only thing that can see a page load, and because events
recorded under the old names still exist.

## 2. The reporting day

One definition, used by every metric: `app.day_of(ts) = (ts at time zone 'UTC')::date`.

The day is **UTC**, not the server's zone and not the person's. A completion at
23:30 UTC belongs to that day and one at 00:30 UTC to the next, whatever time zone
the reading session is set to. There is a test that sets the session to
`Pacific/Auckland` and checks exactly this.

Consequence worth stating: a learner in New Zealand has their evening counted
against the following UTC day. For a UK launch this is the right trade; when it
stops being, the fix is a second set of rollups by local day, not a redefinition
of this one.

## 3. The metrics

### Completion — what someone took in

| Metric | Counts | Does **not** mean |
|---|---|---|
| `cards_completed` | Person-and-card pairs whose completion was recorded that day | Understanding. Completing a card means someone said they took something from it. **Never evidence of mastery** |
| `learners_active` | Distinct accounts that completed at least one card | Visitors, or sessions. Someone who read and left is counted nowhere |
| `first_completions` | Accounts whose earliest completion of anything fell that day | One per account ever. A returning person can never produce another |
| `first_completion_seconds` | Seconds from arrival to first completion, timed by the browser, stored once per account | How long learning takes. It is a clock in a tab that may have been left open. Reported as a median and a ninetieth percentile, never a mean; withheld below five people |
| `returning_learners` | Accounts that completed that day and had completed on an earlier day | A target. Nothing in the product pushes anyone to return |

### Activity — what was done

| Metric | Counts | Does **not** mean |
|---|---|---|
| `cards_opened` | Person-and-card pairs whose first open was recorded that day | Progress. Opening is not learning; it is here to compare against completions, not to be grown |
| `cards_saved` | Cards added to a saved library | An outcome. Saving is an intention |
| `sessions_started` | Sessions begun, counted on the day they began | — |
| `sessions_completed` | Sessions worked through to a summary, counted on the day they ended | A session crossing midnight is started on one day and completed on the next. Neither day is told it had a whole session. An abandoned session is never completed |
| `topics_declared` | Topic interests declared that day, by topic | What was learned. Withheld below five |
| `resources_submitted` | Resources contributed by people | Published cards. Every one is reviewed first |
| `submissions_reviewed` | Reviews concluded that day, by outcome | Only contribution quality: the approval rate describes our editorial standard too |
| `content_reported` | Reports raised, by reason | A finding. Only the resolution says whether anything was wrong |
| `reports_resolved` | Reports closed, by outcome | — |
| `cards_published` | Cards that became publicly readable | — |
| `guests_created` | Accounts created without an email | Visitors. A guest account appears on the first action worth keeping, not on arrival |
| `accounts_registered` | Accounts created with an email | Learning |
| `guest_conversions` | Guest accounts that became registered, split `in_place` / `merged` | A cohort rate. Dated at the moment it happened |

### Reported, and labelled as such

| Metric | Counts | Health warning |
|---|---|---|
| `visit_started` | A browser said it loaded the application for the first time in a tab | An upper bound. Never a denominator for a rate that matters |
| `topic_selected`, `card_opened`, `card_completed`, `card_saved`, `card_skipped`, `session_completed`, `account_created`, `return_visit_with_completion`, `first_card_shown` | What the browser announced | Kept for continuity with Milestone 5 and 6 data. The derived metric of the same meaning is the one to read |

## 4. Rates shown on the dashboard

| Rate | Numerator ÷ denominator | Caveat printed with it |
|---|---|---|
| Session completion rate | `sessions_completed` ÷ `sessions_started` | Both derived. Midnight-crossing sessions make the two slightly out of step day by day; over a period it is sound |
| Saved-resource rate | `cards_saved` ÷ `cards_completed` | Can exceed 100%: saving does not require completing |
| First win per new account | `first_completions` ÷ (`guests_created` + `accounts_registered`) | Accounts, not visitors. Someone who read and left is in neither figure |
| Approval rate | approved ÷ (approved + rejected) | Describes our standard as much as the contributions |
| Guests who registered | `accounts_registered` ÷ `guests_created` in the same window | **Not a cohort.** Someone who arrived last month and registered today is in one figure and not the other |

A rate with a zero or missing denominator is **null**, shown as "Not enough data".
It is never rendered as 0%.

## 5. Suppression

Any breakdown row below **five** is withheld: the count comes back null with
`suppressed = true`, so the dashboard can say "withheld" rather than dropping the
row and looking complete. The median first-win time is withheld the same way.

The threshold lives in `app.suppression_threshold()`, so it cannot be skipped by
querying the table directly. The figure in `metrics.ts` is for explaining the
interface only; if they ever disagree, the database wins.

## 6. Missing data

A day that was never computed is **absent**, not zero. `analytics_rollups` records
which days have been computed and when, and `analytics_overview` is built from it,
so a gap in the dashboard means "not computed" and a zero means "computed, and
nothing happened".

## 7. Reconciliation

`reconcile_day(day)` counts the product tables afresh and compares them against
what is stored, per metric. It reports disagreement rather than correcting it.

One kind of disagreement is expected: **erasure**. When someone deletes their
account, the rows a recomputation would count go with it, so a historical day
recomputed afterwards legitimately falls. The report carries
`erasures_since_rollup`, taken from the audit log, so drift can be explained rather
than guessed at. The stored history is left standing: `analytics_daily` holds no
identifier, so rewriting it would lose a true record of what happened without
making anyone more private.

Tested: a tampered count is caught; recomputation restores agreement; an erasure
produces drift in one direction only, and never the other.

## 8. What is deliberately not measured

- **Time on site.** Not collected, not shown, and not a goal.
- **Scroll depth, dwell time, session frequency targets.** None exist.
- **Application and outcome.** Empty tiers. See `VSHARES_VALUE_FRAMEWORK.md`.
- **Any composite score** of activity and learning. See decision D-059.
