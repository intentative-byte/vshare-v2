import { type NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = onboardingSchema.parse(await request.json());

    if (!body.topicIds.includes(body.selectedTopicId)) {
      return fail("Selected topic must be included in topicIds", 422);
    }

    const now = new Date().toISOString();

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        display_name: body.displayName,
        onboarding_complete: true,
        selected_topic_id: body.selectedTopicId
      },
      { onConflict: "user_id" }
    );

    if (profileError) return fail(profileError.message, 500);

    const { error: resetError } = await supabase
      .from("user_topic_preferences")
      .update({ selected: false })
      .eq("user_id", user.id);

    if (resetError) return fail(resetError.message, 500);

    const preferences = body.topicIds.map((topicId) => ({
      user_id: user.id,
      topic_id: topicId,
      weight: topicId === body.selectedTopicId ? 1 : 0.75,
      selected: topicId === body.selectedTopicId,
      muted: false,
      last_selected_at: topicId === body.selectedTopicId ? now : null
    }));

    const { error: preferenceError } = await supabase
      .from("user_topic_preferences")
      .upsert(preferences, { onConflict: "user_id,topic_id" });

    if (preferenceError) return fail(preferenceError.message, 500);

    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }

    return fromUnknownError(error);
  }
}
