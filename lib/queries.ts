import { demoPosts, demoProfiles } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { FeedItem, Profile } from "@/lib/types";

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  if (!supabase) {
    return demoProfiles[0] ?? null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

export async function getFeedPosts(): Promise<FeedItem[]> {
  const supabase = await createClient();

  if (!supabase) {
    return demoPosts;
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !posts) {
    return demoPosts;
  }

  const authorIds = Array.from(new Set(posts.map((post) => post.author_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, headline")
    .in("id", authorIds);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return posts.map((post, index) => ({
    ...post,
    relevance: Math.max(72, 98 - index * 4),
    profile: profileById.get(post.author_id) ?? null,
  }));
}

export async function getExploreTopics() {
  const posts = await getFeedPosts();
  const topicCounts = new Map<string, number>();

  posts.forEach((post) => {
    post.topics.forEach((topic) => {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    });
  });

  return Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}
