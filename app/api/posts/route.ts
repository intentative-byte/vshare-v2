import { NextResponse, type NextRequest } from "next/server";
import { getFeedPosts } from "@/lib/queries";
import { demoProfiles } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

type PostPayload = Pick<
  Post,
  "title" | "summary" | "url" | "content_type" | "topics" | "difficulty" | "estimated_minutes"
>;

export async function GET() {
  const posts = await getFeedPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const payload = (await request.json()) as PostPayload;

  if (!payload.title?.trim() || !payload.summary?.trim()) {
    return NextResponse.json({ error: "Title and summary are required." }, { status: 422 });
  }

  if (!supabase) {
    // TODO: Reconnect Supabase by persisting created posts once auth/database is restored.
    return NextResponse.json(
      {
        post: {
          id: `demo-${Date.now()}`,
          author_id: demoProfiles[0]?.id ?? "demo-user",
          title: payload.title.trim(),
          summary: payload.summary.trim(),
          url: payload.url?.trim() || null,
          content_type: payload.content_type ?? "article",
          topics: payload.topics ?? [],
          difficulty: payload.difficulty ?? "beginner",
          estimated_minutes: payload.estimated_minutes ?? 10,
          created_at: new Date().toISOString(),
          profile: demoProfiles[0]
            ? {
                username: demoProfiles[0].username,
                full_name: demoProfiles[0].full_name,
                avatar_url: demoProfiles[0].avatar_url,
                headline: demoProfiles[0].headline,
              }
            : null,
        },
        mode: "demo",
      },
      { status: 201 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      url: payload.url?.trim() || null,
      content_type: payload.content_type ?? "article",
      topics: payload.topics ?? [],
      difficulty: payload.difficulty ?? "beginner",
      estimated_minutes: payload.estimated_minutes ?? 10,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
