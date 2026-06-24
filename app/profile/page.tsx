import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { ProfileHero } from "@/components/ProfileHero";
import { getCurrentUserProfile, getFeedPosts } from "@/lib/queries";

export default async function ProfilePage() {
  const [profile, posts] = await Promise.all([getCurrentUserProfile(), getFeedPosts()]);

  return (
    <AppShell active="profile">
      <ProfileHero initialProfile={profile} />

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="rounded-[2rem] bg-ink p-6 text-white shadow-soft">
          <Sparkles className="size-8 text-violet-200" />
          <h2 className="mt-4 text-2xl font-black tracking-tight">Learning signal</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Your saved interests and shared resources shape recommendations across the feed, explore page, and future
            creator matching.
          </p>
        </aside>
        <div className="grid gap-5">
          {posts.slice(0, 2).map((post) => (
            <ContentCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
