"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { getFeed, getTopics, selectTopic } from "@/lib/feed";
import type { FeedItem, Topic, UserTopicPreference } from "@/types/domain";
import { ContentCard } from "@/components/feed/content-card";
import { TopicSelector } from "@/components/topics/topic-selector";
import { Card, SectionTitle } from "@/components/ui/card";

export function FeedClient() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [preferences, setPreferences] = useState<UserTopicPreference[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadFeed = useCallback(
    async ({ reset, topicId, nextCursor }: { reset: boolean; topicId: string | null; nextCursor?: string | null }) => {
      if (!topicId) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await getFeed({
          topicId,
          cursor: reset ? null : nextCursor ?? null,
          signal: controller.signal
        });

        setSelectedTopicId(response.activeTopicId ?? topicId);
        setCursor(response.nextCursor);
        setHasMore(Boolean(response.nextCursor));
        setItems((current) => {
          const source = reset ? [] : current;
          const seen = new Set(source.map((item) => item.id));
          const merged = [...source];

          for (const item of response.items) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }

          return merged;
        });
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load feed");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const topicState = await getTopics();
        if (!mounted) return;

        setTopics(topicState.topics);
        setPreferences(topicState.preferences);
        setSelectedTopicId(topicState.selectedTopicId);

        await loadFeed({ reset: true, topicId: topicState.selectedTopicId });
      } catch (bootstrapError) {
        if (!mounted) return;
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Unable to load feed");
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [loadFeed]);

  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      observerRef.current?.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          void loadFeed({ reset: false, topicId: selectedTopicId, nextCursor: cursor });
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [cursor, hasMore, loadFeed, loading, loadingMore, selectedTopicId]
  );

  async function handleTopicSelect(topicId: string) {
    setSelectedTopicId(topicId);
    setItems([]);
    setCursor(null);
    const topicState = await selectTopic(topicId);
    setPreferences(topicState.preferences);
    await loadFeed({ reset: true, topicId });
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Feed"
        title="Relevant now. Remembered later."
        description="The feed follows your persisted topic, filters out viewed or skipped content, and loads in small cursor-based windows."
      />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black">Active topic</h2>
            <p className="text-sm text-[var(--muted)]">Changing this syncs Explore and Feed immediately.</p>
          </div>
        </div>
        <TopicSelector
          topics={topics}
          preferences={preferences}
          selectedTopicId={selectedTopicId}
          onSelect={handleTopicSelect}
          compact
        />
      </Card>

      {error ? (
        <Card className="flex items-start gap-3 border-red-500/30 bg-red-500/10 text-red-100">
          <AlertCircle className="mt-1 shrink-0" size={18} />
          <p className="text-sm">{error}</p>
        </Card>
      ) : null}

      {!selectedTopicId && !loading ? (
        <Card>
          <h2 className="text-xl font-black">Choose a topic to start</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            VShare will not default to random topics. Pick an interest and it will be remembered.
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-48 animate-pulse bg-white/5" />
          ))
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <div key={item.id} ref={index === items.length - 1 ? lastItemRef : undefined}>
              <ContentCard
                item={item}
                onMemoryChange={(id) => setItems((current) => current.filter((entry) => entry.id !== id))}
              />
            </div>
          ))
        ) : selectedTopicId ? (
          <Card>
            <h2 className="text-xl font-black">No fresh content for this topic yet</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Viewed and skipped items are excluded. Add more content for this topic or select another interest.
            </p>
          </Card>
        ) : null}

        {loadingMore ? (
          <div className="flex justify-center py-5 text-[var(--gold)]">
            <Loader2 className="animate-spin" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
