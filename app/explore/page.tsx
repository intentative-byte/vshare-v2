import { AppShell } from "@/components/AppShell";
import { ExploreClient } from "@/components/ExploreClient";
import { getExploreTopics, getFeedPosts } from "@/lib/queries";

export default async function ExplorePage() {
  const [topics, posts] = await Promise.all([getExploreTopics(), getFeedPosts()]);

  return (
    <AppShell active="explore">
      <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-600">Explore</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Discover what the community is learning.</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Browse active topics, scan shared resources, and jump into the areas that align with your current goals.
        </p>
      </div>

      <ExploreClient initialTopics={topics} initialPosts={posts} />
    </AppShell>
  );
}
