import "server-only";

import { createPublicClient, createRequestClient } from "@/platform/db/server";
import type {
  Card,
  CardSummary,
  Category,
  Topic,
  CategoryAdmin,
  TopicAdmin,
  CardDetail,
  CardVersion,
  AuditEntry,
} from "./types";

/**
 * Every catalogue statement. Reads use the public client where the data is
 * public, so a page can render without a session; anything scoped to a
 * viewer uses the request client and is filtered by row-level security.
 */

const cardSelect = `
  id, slug, format, level, estimated_minutes, is_ai_assisted, is_high_impact,
  published_at, source_url,
  topic:topics!content_items_primary_topic_id_fkey (
    slug, name, category:categories ( slug )
  ),
  version:content_versions!content_items_current_version_id_fkey (
    title, summary, takeaways, next_step, source_name, source_author
  )
`;

type CardRow = {
  id: string;
  slug: string;
  format: Card["format"];
  level: Card["level"];
  estimated_minutes: number;
  is_ai_assisted: boolean;
  is_high_impact: boolean;
  published_at: string | null;
  source_url: string;
  topic: { slug: string; name: string; category: { slug: string } | null } | null;
  version: {
    title: string;
    summary: string;
    takeaways: string[];
    next_step: string;
    source_name: string;
    source_author: string | null;
  } | null;
};

function toCard(row: CardRow): Card | null {
  if (!row.version || !row.topic) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.version.title,
    summary: row.version.summary,
    takeaways: row.version.takeaways,
    nextStep: row.version.next_step,
    source: {
      url: row.source_url,
      name: row.version.source_name,
      author: row.version.source_author,
    },
    topic: { slug: row.topic.slug, name: row.topic.name },
    categorySlug: row.topic.category?.slug ?? "",
    format: row.format,
    level: row.level,
    estimatedMinutes: row.estimated_minutes,
    isAiAssisted: row.is_ai_assisted,
    isHighImpact: row.is_high_impact,
    publishedAt: row.published_at,
  };
}

export async function listCategories(): Promise<Category[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, is_high_impact, topics(count)")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    throw new Error("categories_unavailable");
  }

  return data.map((row) => {
    const counts = row.topics as unknown as Array<{ count: number }> | null;

    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      isHighImpact: row.is_high_impact as boolean,
      topicCount: counts?.[0]?.count ?? 0,
    };
  });
}

export async function findCategoryWithTopics(
  slug: string,
): Promise<{ category: Category; topics: Topic[] } | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, is_high_impact, topics (id, slug, name, sort_order)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error("categories_unavailable");
  }

  if (!data) {
    return null;
  }

  const rawTopics = (data.topics ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    sort_order: number;
  }>;

  const topics: Topic[] = rawTopics
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((topic) => ({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      categorySlug: data.slug as string,
      categoryName: data.name as string,
    }));

  return {
    category: {
      id: data.id as string,
      slug: data.slug as string,
      name: data.name as string,
      description: data.description as string,
      isHighImpact: data.is_high_impact as boolean,
      topicCount: topics.length,
    },
    topics,
  };
}

export async function findPublishedCard(slug: string): Promise<Card | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("content_items")
    .select(cardSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCard(data as unknown as CardRow);
}

export async function findTopicBySlug(
  slug: string,
): Promise<{ id: string; name: string; categorySlug: string } | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("topics")
    .select("id, name, category:categories ( slug )")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const category = data.category as unknown as { slug: string } | null;

  return {
    id: data.id as string,
    name: data.name as string,
    categorySlug: category?.slug ?? "",
  };
}

export async function findPublishedCardById(contentId: string): Promise<Card | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("content_items")
    .select(cardSelect)
    .eq("id", contentId)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCard(data as unknown as CardRow);
}

export async function listPublishedCardsByTopic(topicSlug: string, limit = 24): Promise<Card[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("content_items")
    .select(cardSelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as unknown as CardRow[])
    .map(toCard)
    .filter((card): card is Card => card !== null && card.topic.slug === topicSlug);
}

/** The moderation queue. Row-level security already limits this to staff. */
export async function listCardsForReview(status: string, limit = 50): Promise<CardSummary[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("content_items")
    .select(
      `id, slug, status, level, estimated_minutes, is_high_impact, is_ai_assisted,
       link_checked_at, rejection_reason, created_at,
       topic:topics!content_items_primary_topic_id_fkey ( name ),
       version:content_versions!content_items_current_version_id_fkey ( title )`,
    )
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const topic = row.topic as unknown as { name: string } | null;
    const version = row.version as unknown as { title: string } | null;

    return {
      id: row.id as string,
      slug: row.slug as string,
      title: version?.title ?? "(no version)",
      status: row.status as CardSummary["status"],
      topicName: topic?.name ?? "",
      level: row.level as CardSummary["level"],
      estimatedMinutes: row.estimated_minutes as number,
      isHighImpact: row.is_high_impact as boolean,
      isAiAssisted: row.is_ai_assisted as boolean,
      linkCheckedAt: row.link_checked_at as string | null,
      rejectionReason: row.rejection_reason as string | null,
      createdAt: row.created_at as string,
    };
  });
}

export async function listMySubmissions(): Promise<CardSummary[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("content_items")
    .select(
      `id, slug, status, level, estimated_minutes, is_high_impact, is_ai_assisted,
       link_checked_at, rejection_reason, created_at,
       topic:topics!content_items_primary_topic_id_fkey ( name ),
       version:content_versions!content_items_current_version_id_fkey ( title )`,
    )
    .eq("origin", "user_submitted")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const topic = row.topic as unknown as { name: string } | null;
    const version = row.version as unknown as { title: string } | null;

    return {
      id: row.id as string,
      slug: row.slug as string,
      title: version?.title ?? "(no version)",
      status: row.status as CardSummary["status"],
      topicName: topic?.name ?? "",
      level: row.level as CardSummary["level"],
      estimatedMinutes: row.estimated_minutes as number,
      isHighImpact: row.is_high_impact as boolean,
      isAiAssisted: row.is_ai_assisted as boolean,
      linkCheckedAt: row.link_checked_at as string | null,
      rejectionReason: row.rejection_reason as string | null,
      createdAt: row.created_at as string,
    };
  });
}

export async function callSubmitResource(input: Record<string, unknown>): Promise<string | null> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("submit_resource", input);

  return error ? null : (data as string);
}

export async function callModerate(
  contentId: string,
  action: string,
  reason: string | null,
): Promise<string | null> {
  const supabase = await createRequestClient();

  const { error } = await supabase.rpc("moderate_content", {
    p_content_id: contentId,
    p_action: action,
    p_reason: reason,
  });

  return error ? error.message : null;
}

export async function callResubmit(
  contentId: string,
  fields: {
    title: string;
    summary: string;
    takeaways: string[];
    nextStep: string;
    sourceName: string;
  },
): Promise<string | null> {
  const supabase = await createRequestClient();

  const { error } = await supabase.rpc("resubmit_content", {
    p_content_id: contentId,
    p_title: fields.title,
    p_summary: fields.summary,
    p_takeaways: fields.takeaways,
    p_next_step: fields.nextStep,
    p_source_name: fields.sourceName,
  });

  return error ? error.message : null;
}

export async function callReport(
  contentId: string,
  reason: string,
  note: string | null,
): Promise<boolean> {
  const supabase = await createRequestClient();

  const { error } = await supabase.rpc("report_content", {
    p_content_id: contentId,
    p_reason: reason,
    p_note: note,
  });

  return !error;
}

// -------------------------------------------------- admin reads ----------

/** Every category, archived included, with its topic count. Staff only (RLS). */
export async function listCategoriesForAdmin(): Promise<CategoryAdmin[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_high_impact, archived_at, topics(count)")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const counts = row.topics as unknown as Array<{ count: number }> | null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      sortOrder: row.sort_order as number,
      isHighImpact: row.is_high_impact as boolean,
      archivedAt: row.archived_at as string | null,
      topicCount: counts?.[0]?.count ?? 0,
    };
  });
}

/** Every topic, archived included, with its category. Staff only (RLS). */
export async function listTopicsForAdmin(): Promise<TopicAdmin[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("topics")
    .select("id, slug, name, sort_order, category_id, archived_at, category:categories ( name )")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const category = row.category as unknown as { name: string } | null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      sortOrder: row.sort_order as number,
      categoryId: row.category_id as string,
      categoryName: category?.name ?? "",
      archivedAt: row.archived_at as string | null,
    };
  });
}

function toVersion(row: Record<string, unknown>): CardVersion {
  return {
    versionNo: row.version_no as number,
    title: row.title as string,
    summary: row.summary as string,
    takeaways: (row.takeaways as string[]) ?? [],
    nextStep: row.next_step as string,
    sourceName: row.source_name as string,
    sourceAuthor: (row.source_author as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * One card with everything the admin page shows: its current version, its
 * whole version history, and its moderation trail. Staff only (RLS filters
 * every table here), so a non-staff caller gets null.
 */
export async function getCardForAdmin(contentId: string): Promise<CardDetail | null> {
  const supabase = await createRequestClient();

  const { data: card, error } = await supabase
    .from("content_items")
    .select(
      `id, slug, status, primary_topic_id, level, format, estimated_minutes, quality_score,
       source_url, is_high_impact, is_ai_assisted, link_checked_at, published_at,
       rejection_reason, submitted_by, current_version_id,
       topic:topics!content_items_primary_topic_id_fkey ( name, category:categories ( name ) )`,
    )
    .eq("id", contentId)
    .maybeSingle();

  if (error || !card) {
    return null;
  }

  const { data: versionRows } = await supabase
    .from("content_versions")
    .select("version_no, title, summary, takeaways, next_step, source_name, source_author, created_at")
    .eq("content_id", contentId)
    .order("version_no", { ascending: false });

  const { data: modRows } = await supabase
    .from("moderation_actions")
    .select("action, reason, created_at")
    .eq("content_id", contentId)
    .order("created_at", { ascending: false });

  const versions = (versionRows ?? []).map((row) => toVersion(row as Record<string, unknown>));
  const topic = card.topic as unknown as { name: string; category: { name: string } | null } | null;

  return {
    id: card.id as string,
    slug: card.slug as string,
    status: card.status as CardDetail["status"],
    topicId: card.primary_topic_id as string,
    topicName: topic?.name ?? "",
    categoryName: topic?.category?.name ?? "",
    level: card.level as CardDetail["level"],
    format: card.format as CardDetail["format"],
    estimatedMinutes: card.estimated_minutes as number,
    qualityScore: card.quality_score as number,
    sourceUrl: card.source_url as string,
    isHighImpact: card.is_high_impact as boolean,
    isAiAssisted: card.is_ai_assisted as boolean,
    linkCheckedAt: card.link_checked_at as string | null,
    publishedAt: card.published_at as string | null,
    rejectionReason: card.rejection_reason as string | null,
    currentVersion:
      versions.find((v) => v.versionNo === versions[0]?.versionNo) ?? versions[0] ?? null,
    versions,
    moderation: (modRows ?? []).map((row) => ({
      action: row.action as string,
      reason: (row.reason as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
  };
}

/** The audit log. Admin only — the policy on the table enforces it. */
export async function listAuditLog(limit = 100): Promise<AuditEntry[]> {
  const supabase = await createRequestClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, target_type, target_id, actor_id, created_at")
    .order("id", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as number,
    action: row.action as string,
    targetType: row.target_type as string,
    targetId: row.target_id as string | null,
    createdAt: row.created_at as string,
    hasActor: row.actor_id !== null,
  }));
}

// -------------------------------------------------- admin writes ---------

export async function callUpsertCategory(input: {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isHighImpact: boolean;
  id?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("upsert_category", {
    p_slug: input.slug,
    p_name: input.name,
    p_description: input.description,
    p_sort_order: input.sortOrder,
    p_is_high_impact: input.isHighImpact,
    p_id: input.id ?? null,
  });

  return error ? { error: error.message } : { id: data as string };
}

export async function callUpsertTopic(input: {
  categoryId: string;
  slug: string;
  name: string;
  sortOrder: number;
  id?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("upsert_topic", {
    p_category_id: input.categoryId,
    p_slug: input.slug,
    p_name: input.name,
    p_sort_order: input.sortOrder,
    p_id: input.id ?? null,
  });

  return error ? { error: error.message } : { id: data as string };
}

export async function callSetArchived(
  kind: "category" | "topic",
  id: string,
  archived: boolean,
): Promise<string | null> {
  const supabase = await createRequestClient();
  const fn = kind === "category" ? "set_category_archived" : "set_topic_archived";
  const { error } = await supabase.rpc(fn, { p_id: id, p_archived: archived });

  return error ? error.message : null;
}

export async function callCreateCard(input: {
  slug: string;
  topicId: string;
  sourceUrl: string;
  sourceName: string;
  sourceAuthor?: string;
  title: string;
  summary: string;
  takeaways: string[];
  nextStep: string;
  format: string;
  level: string;
  estimatedMinutes: number;
  qualityScore: number;
  isAiAssisted: boolean;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("create_card", {
    p_slug: input.slug,
    p_primary_topic_id: input.topicId,
    p_source_url: input.sourceUrl,
    p_source_name: input.sourceName,
    p_source_author: input.sourceAuthor ?? null,
    p_title: input.title,
    p_summary: input.summary,
    p_takeaways: input.takeaways,
    p_next_step: input.nextStep,
    p_format: input.format,
    p_level: input.level,
    p_estimated_minutes: input.estimatedMinutes,
    p_quality_score: input.qualityScore,
    p_is_ai_assisted: input.isAiAssisted,
  });

  return error ? { error: error.message } : { id: data as string };
}

/**
 * Record an authenticated editorial decision. The database function sets the
 * reviewer (`app.current_user_id()`), the timestamp and the eligibility; this
 * passes only what the reviewer chose. Returns the new decision id, or an error
 * message (e.g. the reviewer is not staff, or already approved this revision).
 */
export async function callRecordEditorialDecision(input: {
  contentId: string;
  contentVersionId: string;
  decision: string;
  rationale: string;
  evidenceRef?: string;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("record_editorial_decision", {
    p_content_id: input.contentId,
    p_content_version_id: input.contentVersionId,
    p_decision: input.decision,
    p_rationale: input.rationale,
    p_evidence_ref: input.evidenceRef ?? null,
  });

  return error ? { error: error.message } : { id: data as string };
}

/** Whether the content's current revision meets the reviewer quorum. Staff only. */
export async function getEditorialPublicationEligible(contentId: string): Promise<boolean> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("editorial_publication_eligible", {
    p_content_id: contentId,
  });

  return error ? false : Boolean(data);
}

/** Whether the decision ledger's hash chain still validates. Staff only. */
export async function getEditorialLedgerValid(contentId: string): Promise<boolean> {
  const supabase = await createRequestClient();
  const { data, error } = await supabase.rpc("editorial_ledger_valid", {
    p_content_id: contentId,
  });

  return error ? false : Boolean(data);
}

export async function callAddVersion(input: {
  contentId: string;
  title: string;
  summary: string;
  takeaways: string[];
  nextStep: string;
  sourceName: string;
  sourceAuthor?: string;
}): Promise<string | null> {
  const supabase = await createRequestClient();
  const { error } = await supabase.rpc("add_card_version", {
    p_content_id: input.contentId,
    p_title: input.title,
    p_summary: input.summary,
    p_takeaways: input.takeaways,
    p_next_step: input.nextStep,
    p_source_name: input.sourceName,
    p_source_author: input.sourceAuthor ?? null,
  });

  return error ? error.message : null;
}
