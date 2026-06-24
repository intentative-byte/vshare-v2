import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfigurationError } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type PreferencePayload = {
  topics?: string[];
  goals?: string[];
  daily_minutes?: number;
};

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: getSupabaseConfigurationError() ?? "Supabase is not configured." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.from("preferences").select("*").eq("user_id", user.id).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: getSupabaseConfigurationError() ?? "Supabase is not configured." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = (await request.json()) as PreferencePayload;

  const { data, error } = await supabase
    .from("preferences")
    .upsert(
      {
        user_id: user.id,
        topics: payload.topics ?? [],
        goals: payload.goals ?? [],
        daily_minutes: payload.daily_minutes ?? 20,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: data });
}
