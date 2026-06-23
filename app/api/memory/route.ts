import { type NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/supabase/server";
import { contentEventSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = contentEventSchema.parse(await request.json());

    const { error } = await supabase.rpc("record_content_event", {
      p_user_id: user.id,
      p_content_id: body.contentId,
      p_event_type: body.eventType,
      p_watch_time_seconds: body.watchTimeSeconds,
      p_metadata: {
        ...body.metadata,
        source: "memory"
      }
    });

    if (error) return fail(error.message, 500);

    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }

    return fromUnknownError(error);
  }
}
