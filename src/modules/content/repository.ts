import "server-only";

import { createPublicClient, createRequestClient } from "@/platform/db/server";
import type { Card, CardSummary, Category, Topic } from "./types";

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
