import "server-only";

import { createRequestClient } from "@/platform/db/server";

/**
 * Reads for the admin dashboard.
 *
 * Every one of these reads the rollup, never the raw tables, so opening the
 * dashboard cannot be slow and cannot touch anything a learner is waiting
 * on. Row-level security still applies: a non-staff account reading any of
 * these views gets nothing.
 */

export type OverviewDay = {
  day: string;
  computedAt: string;
  cardsCompleted: number;
  cardsSaved: number;
  cardsOpened: number;
  learnersActive: number;
  firstCompletions: number;
  returningLearners: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  resourcesSubmitted: number;
  guestsCreated: number;
  accountsRegistered: number;
  meanSecondsToFirstCompletion: number | null;
  firstCompletionTimings: number;
};

export type BreakdownRow = {
  key: string;
  count: number | null;
  suppressed: boolean;
};

export type ModerationTrend = {
  day: string;
  origin: string;
  approved: number;
  rejected: number;
  meanQualityPublished: number | null;
};

export type FirstWinTiming = {
  timings: number;
  medianSeconds: number | null;
  p90Seconds: number | null;
  suppressed: boolean;
};

export async function loadOverview(days: number): Promise<OverviewDay[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("analytics_overview")
    .select("*")
    .order("day", { ascending: false })
    .limit(days);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    day: row.day as string,
    computedAt: row.computed_at as string,
    cardsCompleted: Number(row.cards_completed ?? 0),
    cardsSaved: Number(row.cards_saved ?? 0),
    cardsOpened: Number(row.cards_opened ?? 0),
    learnersActive: Number(row.learners_active ?? 0),
    firstCompletions: Number(row.first_completions ?? 0),
    returningLearners: Number(row.returning_learners ?? 0),
    sessionsStarted: Number(row.sessions_started ?? 0),
    sessionsCompleted: Number(row.sessions_completed ?? 0),
    resourcesSubmitted: Number(row.resources_submitted ?? 0),
    guestsCreated: Number(row.guests_created ?? 0),
    accountsRegistered: Number(row.accounts_registered ?? 0),
    meanSecondsToFirstCompletion:
      row.mean_seconds_to_first_completion === null
        ? null
        : Number(row.mean_seconds_to_first_completion),
    firstCompletionTimings: Number(row.first_completion_timings ?? 0),
  }));
}

/**
 * A breakdown, already suppressed by the database.
 *
 * A withheld row arrives with a null count and suppressed true, so the
 * dashboard can say "withheld" rather than silently dropping it.
 */
export async function loadBreakdown(
  name: string,
  dimension: string,
  days: number,
): Promise<BreakdownRow[]> {
  const supabase = await createRequestClient();

  // The cutoff is computed here rather than in the page, so the page stays
  // a pure function of what it is given.
  const sinceDay = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("analytics_breakdown")
    .select("dimension_key, count, suppressed")
    .eq("name", name)
    .eq("dimension", dimension)
    .gte("day", sinceDay);

  if (error || !data) {
    return [];
  }

  const totals = new Map<string, { count: number | null; suppressed: boolean }>();

  for (const row of data) {
    const key = row.dimension_key as string;
    const existing = totals.get(key) ?? { count: null, suppressed: false };
    const value = row.count === null ? null : Number(row.count);

    totals.set(key, {
      count: value === null ? existing.count : (existing.count ?? 0) + value,
      // A key is only reported as suppressed if nothing about it got through.
      suppressed: row.suppressed === true && existing.count === null,
    });
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
}

export async function loadModerationTrends(days: number): Promise<ModerationTrend[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("moderation_trends")
    .select("*")
    .order("day", { ascending: false })
    .limit(days);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    day: row.day as string,
    origin: row.origin as string,
    approved: Number(row.approved ?? 0),
    rejected: Number(row.rejected ?? 0),
    meanQualityPublished:
      row.mean_quality_published === null ? null : Number(row.mean_quality_published),
  }));
}

export async function loadFirstWinTiming(): Promise<FirstWinTiming> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("first_win_timing")
    .select("timings, median_seconds, p90_seconds, suppressed")
    .maybeSingle();

  if (error || !data) {
    return { timings: 0, medianSeconds: null, p90Seconds: null, suppressed: false };
  }

  return {
    timings: Number(data.timings ?? 0),
    medianSeconds: data.median_seconds === null ? null : Number(data.median_seconds),
    p90Seconds: data.p90_seconds === null ? null : Number(data.p90_seconds),
    suppressed: data.suppressed === true,
  };
}
