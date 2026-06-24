"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Hash } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { useDemoOnboarding } from "@/lib/demo";
import type { FeedItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type ExploreTopic = {
  topic: string;
  count: number;
};

type ExploreClientProps = {
  initialTopics: ExploreTopic[];
  initialPosts: FeedItem[];
};

export function ExploreClient({ initialTopics, initialPosts }: ExploreClientProps) {
  const demoOnboarding = useDemoOnboarding();
  const localTopics = useMemo(() => demoOnboarding?.topics ?? [], [demoOnboarding]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const topics = useMemo(() => {
    const topicCounts = new Map(initialTopics.map((item) => [item.topic, item.count]));

    localTopics.forEach((topic) => {
      topicCounts.set(topic, Math.max(topicCounts.get(topic) ?? 0, 1));
    });

    return Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => {
        const aIsLocal = localTopics.includes(a.topic);
        const bIsLocal = localTopics.includes(b.topic);

        if (aIsLocal !== bIsLocal) {
          return aIsLocal ? -1 : 1;
        }

        return b.count - a.count;
      });
  }, [initialTopics, localTopics]);

  const visiblePosts = useMemo(() => {
    if (!selectedTopic) {
      return initialPosts.slice(0, 3);
    }

    return initialPosts.filter((post) => post.topics.includes(selectedTopic));
  }, [initialPosts, selectedTopic]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-black tracking-tight">Trending topics</h2>
        {localTopics.length ? (
          <p className="mt-2 text-sm font-semibold text-violet-700">Using your locally saved demo topics.</p>
        ) : null}
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => setSelectedTopic(null)}
            className={cn(
              "flex items-center justify-between rounded-2xl bg-mist p-4 text-left font-bold text-ink transition hover:bg-violet-50",
              !selectedTopic && "bg-ink text-white hover:bg-ink",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Hash className="size-4 text-violet-600" />
              All topics
            </span>
            <ArrowRight className="size-4" />
          </button>
          {topics.map((item) => (
            <button
              key={item.topic}
              type="button"
              onClick={() => setSelectedTopic(item.topic)}
              className={cn(
                "flex items-center justify-between rounded-2xl bg-mist p-4 text-left font-bold text-ink transition hover:bg-violet-50",
                selectedTopic === item.topic && "bg-ink text-white hover:bg-ink",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Hash className="size-4 text-violet-600" />
                {item.topic}
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                {item.count}
                <ArrowRight className="size-4" />
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="grid gap-5">
        {visiblePosts.length ? (
          visiblePosts.map((post) => <ContentCard key={post.id} post={post} />)
        ) : (
          <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
            <h2 className="text-2xl font-black tracking-tight">No demo resources for {selectedTopic} yet.</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Pick another topic or update onboarding to tune the local demo feed.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
