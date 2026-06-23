import { type NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validators";
import type { Profile, Topic, UserTopicPreference } from "@/types/domain";

export const dynamic = "force-dynamic";

async function getProfileState(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string) {
  const [profileResult, topicsResult, preferencesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, onboarding_complete, selected_topic_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("topics")
      .select("id, slug, name, description, color, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("user_topic_preferences")
      .select("topic_id, weight, selected, muted, last_selected_at, topics(id, slug, name, description, color, is_active)")
      .eq("user_id", userId)
      .order("weight", { ascending: false })
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (topicsResult.error) throw new Error(topicsResult.error.message);
  if (preferencesResult.error) throw new Error(preferencesResult.error.message);

  return {
    profile: profileResult.data as Profile,
    topics: (topicsResult.data ?? []) as Topic[],
    preferences: (preferencesResult.data ?? []) as unknown as UserTopicPreference[]
  };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    await supabase.from("profiles").upsert({ user_id: user.id }, { onConflict: "user_id" });

    return ok(await getProfileState(supabase, user.id));
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
    const body = profileUpdateSchema.parse(await request.json());

    const updatePayload = {
      user_id: user.id,
      ...(body.displayName ? { display_name: body.displayName } : {}),
      ...(body.selectedTopicId ? { selected_topic_id: body.selectedTopicId } : {}),
      ...(typeof body.onboardingComplete === "boolean"
        ? { onboarding_complete: body.onboardingComplete }
        : {})
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(updatePayload, { onConflict: "user_id" })
      .select("user_id, display_name, avatar_url, onboarding_complete, selected_topic_id")
      .single();

    if (error) return fail(error.message, 500);

    return ok({ profile: data as Profile });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return fail("Unauthorized", 401);
    }

    return fromUnknownError(error);
  }
}
