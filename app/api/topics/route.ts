import { type NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/supabase/server";
import { topicSelectionSchema } from "@/lib/validators";
import type { Topic, UserTopicPreference } from "@/types/domain";

export const dynamic = "force-dynamic";

async function getTopicState(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string) {
  const [topicsResult, preferencesResult, profileResult] = await Promise.all([
    supabase
      .from("topics")
      .select("id, slug, name, description, color, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("user_topic_preferences")
      .select("topic_id, weight, selected, muted, last_selected_at, topics(id, slug, name, description, color, is_active)")
      .eq("user_id", userId)
      .order("weight", { ascending: false }),
    supabase
      .from("profiles")
      .select("selected_topic_id")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  if (topicsResult.error) throw new Error(topicsResult.error.message);
  if (preferencesResult.error) throw new Error(preferencesResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  return {
    topics: (topicsResult.data ?? []) as Topic[],
    preferences: (preferencesResult.data ?? []) as UserTopicPreference[],
    selectedTopicId: profileResult.data?.selected_topic_id ?? null
  };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    await supabase.from("profiles").upsert({ user_id: user.id }, { onConflict: "user_id" });

    return ok(await getTopicState(supabase, user.id));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }

    return fromUnknownError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = topicSelectionSchema.parse(await request.json());

    const { error: resetError } = await supabase
      .from("user_topic_preferences")
      .update({ selected: false })
      .eq("user_id", user.id);

    if (resetError) return fail(resetError.message, 500);

    const { error: preferenceError } = await supabase.from("user_topic_preferences").upsert(
      {
        user_id: user.id,
        topic_id: body.topicId,
        selected: body.selected,
        muted: false,
        weight: 1,
        last_selected_at: new Date().toISOString()
      },
      { onConflict: "user_id,topic_id" }
    );

    if (preferenceError) return fail(preferenceError.message, 500);

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          selected_topic_id: body.topicId
        },
        { onConflict: "user_id" }
      );

    if (profileError) return fail(profileError.message, 500);

    return ok(await getTopicState(supabase, user.id));
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }

    return fromUnknownError(error);
  }
}
