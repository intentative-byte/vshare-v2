import { AppShell } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { CreatePostForm } from "@/components/CreatePostForm";
import { FeedHero } from "@/components/FeedHero";
import { getCurrentUserProfile, getFeedPosts } from "@/lib/queries";

export default async function FeedPage() {
  const [profile, posts] = await Promise.all([getCurrentUserProfile(), getFeedPosts()]);

  return (
    <AppShell active="feed">
      <div className="mb-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <FeedHero initialProfile={profile} />
        <CreatePostForm />
      </div>

      <div className="grid gap-5">
        {posts.map((post) => (
          <ContentCard key={post.id} post={post} />
        ))}
      </div>
    </AppShell>
  );
}
