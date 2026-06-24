import { NextResponse, type NextRequest } from "next/server";
import { demoProfiles } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type ProfilePayload = {
  username?: string;
  full_name?: string | null;
  headline?: string | null;
  avatar_url?: string | null;
  interests?: string[];
};

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    // TODO: Reconnect Supabase by returning the authenticated profile once auth/database is restored.
    return NextResponse.json({ profile: demoProfiles[0] ?? null, mode: "demo" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const payload = (await request.json()) as ProfilePayload;
  const username = payload.username?.trim().toLowerCase();

  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 422 });
  }

  if (!supabase) {
    // TODO: Reconnect Supabase by persisting profile updates once auth/database is restored.
    return NextResponse.json({
      profile: {
        ...(demoProfiles[0] ?? {}),
        id: demoProfiles[0]?.id ?? "demo-user",
        username,
        full_name: payload.full_name ?? username,
        headline: payload.headline ?? null,
        avatar_url: payload.avatar_url ?? null,
        interests: payload.interests ?? [],
        created_at: demoProfiles[0]?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      mode: "demo",
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username,
        full_name: payload.full_name ?? user.user_metadata.full_name ?? null,
        headline: payload.headline ?? null,
        avatar_url: payload.avatar_url ?? user.user_metadata.avatar_url ?? null,
        interests: payload.interests ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}
