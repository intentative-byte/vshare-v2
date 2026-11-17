import "server-only";

import { createRequestClient } from "@/platform/db/server";
import type { Candidate, LearnerContext, RankingConfig } from "@/modules/vai";

/**
 * The data the feed needs: the active ranking configuration, what we know
 * about the viewer, and the pool of cards they have not finished with.
 *
 * The candidate query is the only place that decides what is eligible, and
 * it only ever asks for published content. Row-level security refuses
 * anything else regardless, so eligibility is enforced twice.
 */

export async function loadActiveConfig(): Promise<RankingConfig | null> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("ranking_configs")
    .select("version, weights, params")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    version: data.version as number,
    weights: data.weights as RankingConfig["weights"],
    params: data.params as RankingConfig["params"],
  };
}

type CandidateRow = {
  id: string;
  primary_topic_id: string;
  quality_score: number;
  level: Candidate["level"];
  estimated_minutes: number;
  published_at: string;
  format: Candidate["format"];
  content_versions: { source_name: string } | null;
  content_stats: { impressions: number; completions: number } | null;
  content_topics: Array<{ topic_id: string }> | null;
};

/**
 * Cards this viewer could usefully be shown.
 *
 * Excluded: anything not published, anything they have completed, anything
 * they skipped or marked not useful, and anything shown recently without
 * being opened. Those exclusions are why a completed card cannot dominate
 * the feed and a skip genuinely changes what comes next.
 */
export async function loadCandidates(options: {
  topicId: string | null;
  excludeIds: string[];
  limit?: number;
}): Promise<Candidate[]> {
  const supabase = await createRequestClient();

  let query = supabase
    .from("content_items")
    .select(
      `id, primary_topic_id, quality_score, level, estimated_minutes, published_at, format,
       content_versions!content_items_current_version_id_fkey ( source_name ),
       content_stats ( impressions, completions ),
       content_topics ( topic_id )`,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 200);

  if (options.topicId) {
    query = query.eq("primary_topic_id", options.topicId);
  }

  if (options.excludeIds.length > 0) {
    query = query.not("id", "in", `(${options.excludeIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as unknown as CandidateRow[]).map((row) => ({
    contentId: row.id,
    topicId: row.primary_topic_id,
    secondaryTopicIds: (row.content_topics ?? []).map((entry) => entry.topic_id),
    sourceName: row.content_versions?.source_name ?? "",
    qualityScore: row.quality_score,
    level: row.level,
    estimatedMinutes: row.estimated_minutes,
    publishedAt: row.published_at,
    format: row.format,
    stats: {
      impressions: row.content_stats?.impressions ?? 0,
      completions: row.content_stats?.completions ?? 0,
    },
  }));
}

export type ViewerMemory = {
  context: Omit<LearnerContext, "now" | "personalisationEnabled" | "preferredMinutes">;
  /** Cards to leave out of the candidate pool entirely. */
  excludeIds: string[];
};

/** Everything the ranker knows about the viewer, all of it their own doing. */
export async function loadViewerMemory(repeatWindowHours: number): Promise<ViewerMemory> {
  const supabase = await createRequestClient();

  const [topicsResult, interactionsResult, formatsResult] = await Promise.all([
    supabase.from("user_topics").select("topic_id, declared, affinity, level, observations"),
    supabase
      .from("content_interactions")
      .select(
        "content_id, impressions, opened_at, completed_at, skipped_at, feedback, last_impressed_at",
      ),
    supabase.from("user_format_affinity").select("format, affinity"),
  ]);

  const declaredTopicIds: string[] = [];
  const affinityByTopic: Record<string, number> = {};
  const levelByTopic: Record<string, LearnerContext["levelByTopic"][string]> = {};
  const observationsByTopic: Record<string, number> = {};
  const formatAffinity: Record<string, number> = {};

  for (const row of topicsResult.data ?? []) {
    const topicId = row.topic_id as string;

    if (row.declared) {
      declaredTopicIds.push(topicId);
    }

    affinityByTopic[topicId] = Number(row.affinity);
    levelByTopic[topicId] = row.level as LearnerContext["levelByTopic"][string];
    observationsByTopic[topicId] = Number(row.observations ?? 0);
  }

  for (const row of formatsResult.data ?? []) {
    formatAffinity[row.format as string] = Number(row.affinity);
  }

  const impressionsByContent: Record<string, number> = {};
  const excludeIds: string[] = [];
  const cutoff = Date.now() - repeatWindowHours * 60 * 60 * 1000;

  for (const row of interactionsResult.data ?? []) {
    const contentId = row.content_id as string;
    impressionsByContent[contentId] = row.impressions as number;

    const completed = row.completed_at !== null;
    const skipped = row.skipped_at !== null;
    const notUseful = row.feedback === "not_useful";
    const shownRecentlyUnopened =
      row.opened_at === null &&
      row.last_impressed_at !== null &&
      new Date(row.last_impressed_at as string).getTime() > cutoff;

    if (completed || skipped || notUseful || shownRecentlyUnopened) {
      excludeIds.push(contentId);
    }
  }

  return {
    context: {
      declaredTopicIds,
      affinityByTopic,
      levelByTopic,
      observationsByTopic,
      formatAffinity,
      impressionsByContent,
      // Sources of things completed in the last day, so a session does not
      // read like one publisher's newsletter.
      recentSourceNames: [],
    },
    excludeIds,
  };
}

export async function startSession(topicId: string | null, size: number): Promise<string | null> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase.rpc("start_feed_session", {
    p_topic_id: topicId,
    p_size: size,
  });

  return error ? null : (data as string);
}

export async function recordRecommendations(
  sessionId: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const supabase = await createRequestClient();
  await supabase.rpc("record_recommendations", { p_session_id: sessionId, p_rows: rows });
}

export async function endSession(sessionId: string): Promise<Record<string, number> | null> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("end_feed_session", { p_session_id: sessionId });

  return error ? null : (data as Record<string, number>);
}

/** The components logged when a card was shown, for "Why this?". */
export async function loadRecommendationComponents(
  sessionId: string,
  contentId: string,
): Promise<{ components: Record<string, number>; isDiscovery: boolean } | null> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("recommendations")
    .select("components, is_discovery")
    .eq("session_id", sessionId)
    .eq("content_id", contentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    components: data.components as Record<string, number>,
    isDiscovery: data.is_discovery as boolean,
  };
}

/**
 * Records a seven-piece session's feedback. Everything is optional; a call
 * with only a session id is a usefulness-less skip that still stores the
 * review row. The database nudges the learned format preference.
 */
export async function recordReview(input: {
  sessionId: string;
  useful?: boolean;
  rating?: number;
  preferredFormat?: string;
  note?: string;
}): Promise<string | null> {
  const supabase = await createRequestClient();

  const { error } = await supabase.rpc("record_session_review", {
    p_session_id: input.sessionId,
    p_useful: input.useful ?? null,
    p_rating: input.rating ?? null,
    p_preferred_format: input.preferredFormat ?? null,
    p_note: input.note ?? null,
  });

  return error ? error.message : null;
}
