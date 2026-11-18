# VSHARES — Value Measurement Framework (initial)

- Date: 2026-11-14 · Milestone 7 · **Version 0.1**
- The question this exists to answer: *are people gaining something meaningful from
  their time on VSHARES?*

## 1. Why a framework rather than a score

The obvious thing to build is one number that goes up. We are not building it.

Every composite "value score" we could compute today would be a restatement of
activity wearing a different name, because activity is the only thing we measure
well. A person who opens forty cards would outscore a person who finishes two and
uses one of them, which is exactly backwards and exactly what the product exists
to reject.

So the framework is four tiers that are **never added together**. Two are
measured. Two are empty, and say so.

## 2. The four tiers

| Tier | What it is | Status today |
|---|---|---|
| **Activity** | Things that were actually done: cards opened, sessions started, resources saved, topics chosen, contributions made | **Measured.** Derived from the product tables |
| **Completion** | Learning resources someone said they took something from, and how soon the first one came | **Measured.** Derived from the product tables |
| **Application** | Evidence that something was used in real life, supplied by the person | **Not measured.** Nothing in VSHARES collects it. No number is shown |
| **Outcome** | Measured improvement in capability | **Not measured and not estimated.** We have no valid evidence for it |

The dashboard prints the empty tiers with that text in them. An empty space would
be read as an oversight; the statement is the honest version.

### Why the gap between activity and completion matters

Opened and completed are both recorded, on purpose. The ratio between them is one
of the few honest signals we have about whether the catalogue is any good: cards
that are opened and abandoned are a content problem, not a user problem.

Opening is never progress. It has never been counted as learning anywhere in the
product, and the ranking does not reward it (D-048).

## 3. The measures that answer the question

Four, in priority order.

1. **First learning win rate** — of the accounts created, how many completed
   something. If someone arrives, acts, and never finishes anything useful, the
   product failed at its one job.
2. **Time to first learning win** — the product benchmark. Median and ninetieth
   percentile, never a mean, withheld below five people.
3. **Returning learners** — people who came back on a later day and finished
   something else. Read as evidence that it was worth returning to, never as a
   retention target to be optimised.
4. **Completion-to-open ratio** — whether the things we recommend are worth the
   time they ask for.

## 4. Measures we will not adopt

| Not used | Why |
|---|---|
| Time on site, session length as a goal | The metric the product exists to reject. Session length is recorded only to know whether finite sessions are the right size |
| Daily active users as a headline | Rewards habit, not value. `learners_active` counts people who completed something, which is a different question |
| Streaks, consecutive-day counts | Pressure dressed as progress. Explicitly out of scope (directive §9) |
| Scroll depth, dwell time | Not collected |
| Any mastery, intelligence or improvement percentage | We have no way to measure them honestly (D-059) |
| A single composite value score | See §1. Revisit only when application and outcome carry real evidence |

## 5. What would move a tier out of "empty"

**Application** becomes measurable when a person can record that they used
something — a commitment, a log, a reflection — and that record is theirs rather
than inferred. That is Applied Learning, specified in the roadmap for R2. Until it
exists, the tier stays empty rather than being approximated from saves.

**Outcome** becomes measurable when something independent of our own product
confirms a change in capability: a graded assessment, a verified piece of work, a
result someone reports and we can attribute. Nothing like it exists yet, and the
bar for calling something an outcome will not be lowered to fill the space.

## 6. How to read the dashboard honestly

- A rate with no denominator reads "Not enough data", never 0%.
- A withheld row says "withheld", never nothing.
- A day that was not computed is absent, not zero.
- Every figure prints what it does not mean, next to the figure.
- The headline question is first-win rate and time to first win. Volume numbers
  are context, not success.

## 7. Open for owner decision

1. **Target values.** This framework defines the measures; it sets no targets.
   Spec §B1 proposes validation targets for the first cohort — confirm or amend.
2. **The reporting day is UTC.** Fine for a UK launch; revisit before any launch
   further east.
3. **Guest conversion is a window ratio, not a cohort.** A true cohort view needs
   to follow accounts over time. Worth building only once there are enough
   accounts for it to mean anything.
