/**
 * The metrics dictionary.
 *
 * Every number VSHARES reports has an entry here saying what it counts,
 * where it comes from, and what it does not mean. The same text is shown
 * beside the number in the admin dashboard, so a figure can never be read
 * as something it is not.
 *
 * The long form, with the SQL behind each one, is in
 * docs/VSHARES_METRICS_DICTIONARY.md.
 */

/**
 * How a number was produced.
 *
 * `derived` is recomputed from the product tables, so repeating an action or
 * replaying an event cannot move it. `reported` is what a browser said and
 * cannot be verified.
 */
export type MetricSource = "derived" | "reported";

/**
 * Where a metric sits in the value framework.
 *
 * The tiers are deliberately not addable together. Someone who opened forty
 * cards has done more activity than someone who finished two, and learned
 * less.
 */
export type ValueTier = "activity" | "completion" | "application" | "outcome";

export type MetricDefinition = {
  name: string;
  label: string;
  tier: ValueTier;
  source: MetricSource;
  /** What it counts, exactly. */
  definition: string;
  /** What it must not be read as. Shown wherever the number appears. */
  limit: string;
};

export const valueTiers: Record<ValueTier, { label: string; meaning: string; status: string }> = {
  activity: {
    label: "Activity",
    meaning: "Things that were actually done: cards opened, sessions started, resources saved.",
    status: "Measured.",
  },
  completion: {
    label: "Completion",
    meaning: "Learning resources someone said they took something from.",
    status: "Measured.",
  },
  application: {
    label: "Application",
    meaning: "Evidence that something was used in real life, supplied by the person themselves.",
    status: "Not measured. Nothing in VSHARES collects it yet, so no number is shown.",
  },
  outcome: {
    label: "Outcome",
    meaning: "Measured improvement in capability.",
    status:
      "Not measured, and not estimated. We have no valid evidence for it, so the tier is empty rather than filled with something plausible.",
  },
};

export const metrics: MetricDefinition[] = [
  {
    name: "cards_completed",
    label: "Cards completed",
    tier: "completion",
    source: "derived",
    definition:
      "Distinct person-and-card pairs whose completion was recorded on this day. Counted from the interaction record, one row per person per card.",
    limit:
      "Completing a card means someone said they took something from it. It is not a measure of understanding, and it is never evidence of mastery.",
  },
  {
    name: "learners_active",
    label: "People who completed something",
    tier: "completion",
    source: "derived",
    definition: "Distinct accounts that completed at least one card on this day.",
    limit:
      "Not visitors, and not sessions. Someone who read and left is deliberately counted nowhere.",
  },
  {
    name: "first_completions",
    label: "First learning wins",
    tier: "completion",
    source: "derived",
    definition:
      "Accounts whose earliest completion of any card fell on this day. Recomputed from the whole history, so it cannot be double counted.",
    limit: "One per account, ever. A returning person can never produce another.",
  },
  {
    name: "first_completion_seconds",
    label: "Time to first learning win",
    tier: "completion",
    source: "derived",
    definition:
      "Seconds from arriving to completing a first card, timed by the browser and stored once against the account.",
    limit:
      "The browser is the only thing that can measure this, so it is as honest as the clock in a tab that may have been left open. A median and a ninetieth percentile are shown rather than a mean, and it is withheld below five people.",
  },
  {
    name: "returning_learners",
    label: "Returning learners",
    tier: "completion",
    source: "derived",
    definition:
      "Accounts that completed a card on this day and had completed one on an earlier day.",
    limit:
      "A measure of whether VSHARES was worth coming back to, not a target. Nothing in the product pushes anyone to return.",
  },
  {
    name: "cards_opened",
    label: "Cards opened",
    tier: "activity",
    source: "derived",
    definition: "Distinct person-and-card pairs whose first open was recorded on this day.",
    limit:
      "Opening is not learning and never counts as progress. It is here to compare against completions, not to be grown.",
  },
  {
    name: "cards_saved",
    label: "Resources saved",
    tier: "activity",
    source: "derived",
    definition: "Cards added to a saved library on this day.",
    limit: "Saving something is an intention, not an outcome.",
  },
  {
    name: "sessions_started",
    label: "Sessions started",
    tier: "activity",
    source: "derived",
    definition: "Learning sessions begun on this day, counted on the day they began.",
    limit:
      "A session that runs past midnight is counted as started on one day and completed on the next. Neither day is told it had a whole session.",
  },
  {
    name: "sessions_completed",
    label: "Sessions completed",
    tier: "activity",
    source: "derived",
    definition: "Sessions worked through to their summary, counted on the day they ended.",
    limit: "An abandoned session is never counted as completed.",
  },
  {
    name: "topics_declared",
    label: "Topics chosen",
    tier: "activity",
    source: "derived",
    definition: "Topic interests declared on this day, broken down by topic.",
    limit:
      "What someone said they were interested in, not what they went on to learn. Topic breakdowns are withheld below five.",
  },
  {
    name: "resources_submitted",
    label: "Resources submitted",
    tier: "activity",
    source: "derived",
    definition: "Resources contributed by people using VSHARES, counted on the day submitted.",
    limit: "A submission is not a published card. Every one is reviewed by a person first.",
  },
  {
    name: "submissions_reviewed",
    label: "Submissions reviewed",
    tier: "activity",
    source: "derived",
    definition: "Submissions whose review concluded on this day, broken down by the outcome.",
    limit: "The approval rate describes our editorial standard as much as the contributions.",
  },
  {
    name: "content_reported",
    label: "Content reported",
    tier: "activity",
    source: "derived",
    definition: "Reports raised on this day, broken down by reason.",
    limit:
      "A report is a concern, not a finding. Only the resolution says whether anything was wrong.",
  },
  {
    name: "guests_created",
    label: "Guest accounts created",
    tier: "activity",
    source: "derived",
    definition: "Accounts created without an email address on this day.",
    limit:
      "A guest account appears on the first action worth keeping, not on arrival, so this is not a visitor count.",
  },
  {
    name: "accounts_registered",
    label: "Accounts registered",
    tier: "activity",
    source: "derived",
    definition: "Accounts created with an email address on this day.",
    limit: "Registering is not learning.",
  },
  {
    name: "guest_conversions",
    label: "Guests who registered",
    tier: "activity",
    source: "derived",
    definition:
      "Guest accounts that became registered ones, either in place or by merging into an existing account.",
    limit:
      "Dated at the moment it happened, so it is not inferred from anything. The two routes are counted separately.",
  },
  {
    name: "visit_started",
    label: "Visits (browser-reported)",
    tier: "activity",
    source: "reported",
    definition: "A browser said it had loaded the application for the first time in a tab.",
    limit:
      "Reported, not measured. Nothing stops a browser saying it twice, so this is an upper bound and must never be a denominator for a rate that matters.",
  },
];

export function findMetric(name: string): MetricDefinition | undefined {
  return metrics.find((metric) => metric.name === name);
}

export const metricsByTier = (tier: ValueTier): MetricDefinition[] =>
  metrics.filter((metric) => metric.tier === tier);

/**
 * The threshold below which a breakdown is withheld.
 *
 * The database applies this; the figure is repeated here only so the
 * interface can explain itself. Changing it here changes nothing.
 */
export const suppressionThreshold = 5;

/**
 * A rate, or null when the denominator is too small to carry one.
 *
 * Returning null rather than 0 or NaN is deliberate: "no data" and "nobody
 * did it" are different answers and the dashboard shows them differently.
 */
export function rate(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Seconds as a short human phrase. Null stays null. */
export function describeSeconds(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) {
    return null;
  }

  if (seconds < 90) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);

  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}
