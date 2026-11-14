import "server-only";

import { createRequestClient } from "@/platform/db/server";
import type { EventName } from "./events";

/**
 * Recording an event.
 *
 * The database decides what is stored: the aggregate count always, the
 * identified row only if that account has granted consent. Consent is never
 * trusted from the caller.
 */
export async function recordEvent(input: {
  name: EventName;
  dimension?: string;
  dimensionKey?: string;
  value?: number;
  sessionId?: string;
  contentId?: string;
  topicId?: string;
}): Promise<void> {
  const supabase = await createRequestClient();

  await supabase.rpc("record_event", {
    p_name: input.name,
    p_dimension: input.dimension ?? "all",
    p_dimension_key: input.dimensionKey ?? "all",
    p_value: input.value ?? null,
    p_session_id: input.sessionId ?? null,
    p_content_id: input.contentId ?? null,
    p_topic_id: input.topicId ?? null,
  });
}

export type FirstWinRow = {
  day: string;
  visits: number | null;
  topicsChosen: number | null;
  completions: number | null;
  accountsCreated: number | null;
  meanSecondsToFirstCompletion: number | null;
};

/** The first-learning-win funnel, from aggregates that hold no identifiers. */
export async function loadFirstWinMetrics(days = 30): Promise<FirstWinRow[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("first_win_metrics")
    .select("*")
    .order("day", { ascending: false })
    .limit(days);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    day: row.day as string,
    visits: row.visits as number | null,
    topicsChosen: row.topics_chosen as number | null,
    completions: row.completions as number | null,
    accountsCreated: row.accounts_created as number | null,
    meanSecondsToFirstCompletion: row.mean_seconds_to_first_completion as number | null,
  }));
}
