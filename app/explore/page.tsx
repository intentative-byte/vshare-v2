import Link from "next/link";
import { ArrowRight, Hash } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
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

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black tracking-tight">Trending topics</h2>
          <div className="mt-5 grid gap-3">
            {topics.map((item) => (
              <Link
                key={item.topic}
                href={`/feed?topic=${encodeURIComponent(item.topic)}`}
                className="flex items-center justify-between rounded-2xl bg-mist p-4 font-bold text-ink transition hover:bg-violet-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Hash className="size-4 text-violet-600" />
                  {item.topic}
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                  {item.count}
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </aside>

        <section className="grid gap-5">
          {posts.slice(0, 3).map((post) => (
            <ContentCard key={post.id} post={post} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
