"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTopics, selectTopic } from "@/lib/feed";
import type { Topic, UserTopicPreference } from "@/types/domain";
import { AppShell } from "@/components/layout/app-shell";
import { Card, SectionTitle } from "@/components/ui/card";
import { TopicSelector } from "@/components/topics/topic-selector";
import { Button } from "@/components/ui/button";

export function ExploreClient() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [preferences, setPreferences] = useState<UserTopicPreference[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await getTopics();
        setTopics(response.topics);
        setPreferences(response.preferences);
        setSelectedTopicId(response.selectedTopicId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load topics");
      }
    }

    load();
  }, []);

  async function handleSelect(topicId: string) {
    setSavingTopicId(topicId);
    setSelectedTopicId(topicId);

    try {
      const response = await selectTopic(topicId);
      setPreferences(response.preferences);
      setSelectedTopicId(response.selectedTopicId);
      router.prefetch("/feed");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save topic");
    } finally {
      setSavingTopicId(null);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionTitle
          eyebrow="Explore"
          title="Pick the topic your feed should follow."
          description="Topic selection is persisted immediately so the feed never falls back to random content."
        />

        {error ? <Card className="border-red-500/30 bg-red-500/10 text-sm text-red-100">{error}</Card> : null}

        <TopicSelector
          topics={topics}
          preferences={preferences}
          selectedTopicId={selectedTopicId}
          onSelect={handleSelect}
        />

        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black">Explore to Feed sync</h2>
            <p className="text-sm text-[var(--muted)]">
              {savingTopicId ? "Saving your topic..." : "Your next feed refresh will use the selected topic."}
            </p>
          </div>
          <Button onClick={() => router.push("/feed")}>Open feed</Button>
        </Card>
      </div>
    </AppShell>
  );
}
