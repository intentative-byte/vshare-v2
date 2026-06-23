import { AppShell } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { CreatePostForm } from "@/components/CreatePostForm";
import { getCurrentUserProfile, getFeedPosts } from "@/lib/queries";

export default async function FeedPage() {
  const [profile, posts] = await Promise.all([getCurrentUserProfile(), getFeedPosts()]);

  return (
    <AppShell active="feed">
      <div className="mb-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Personal feed</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}.` : "Your learning feed is ready."}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">
            High-signal resources are ranked by topic overlap, learning intent, and freshness. Configure Supabase to
            replace demo recommendations with your own network.
          </p>
        </section>
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
