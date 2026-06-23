import { NextResponse, type NextRequest } from "next/server";
import { getFeedPosts } from "@/lib/queries";
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

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const payload = (await request.json()) as PostPayload;

  if (!payload.title?.trim() || !payload.summary?.trim()) {
    return NextResponse.json({ error: "Title and summary are required." }, { status: 422 });
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
