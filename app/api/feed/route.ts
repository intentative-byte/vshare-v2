import { type NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/lib/api-response";
import { getServerEnv } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";
import { feedQuerySchema } from "@/lib/validators";
import type { FeedItem } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const env = getServerEnv();
    const query = feedQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const limit = query.limit ?? env.FEED_PAGE_SIZE;

    const { data, error } = await supabase.rpc("get_feed_items", {
      p_user_id: user.id,
      p_topic_id: query.topicId ?? null,
      p_limit: limit,
      p_cursor: query.cursor ?? null
    });

    if (error) {
      return fail(error.message, 500);
    }

    const items = (data ?? []) as FeedItem[];
    const nextCursor = items.length === limit ? items[items.length - 1]?.next_cursor ?? null : null;
    const activeTopicId = query.topicId ?? items[0]?.topic_id ?? null;

    return ok({
      items,
      nextCursor,
      activeTopicId
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }

    return fromUnknownError(error);
  }
}
