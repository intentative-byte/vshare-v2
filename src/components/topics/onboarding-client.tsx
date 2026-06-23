"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTopics } from "@/lib/feed";
import type { Topic } from "@/types/domain";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TopicSelector } from "@/components/topics/topic-selector";

export function OnboardingClient() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await getTopics();
        setTopics(response.topics);
        setSelectedTopicId(response.selectedTopicId);
        setTopicIds(response.preferences.map((preference) => preference.topic_id));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load onboarding");
      }
    }

    load();
  }, []);

  function toggleTopic(topicId: string) {
    setTopicIds((current) => {
      const exists = current.includes(topicId);
      const next = exists ? current.filter((id) => id !== topicId) : [...current, topicId];

      if (!selectedTopicId || !next.includes(selectedTopicId)) {
        setSelectedTopicId(next[0] ?? null);
      }

      return next;
    });
  }

  async function submit() {
    if (!selectedTopicId || topicIds.length === 0) {
      setError("Choose at least one topic and an active feed topic.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName || undefined,
        topicIds,
        selectedTopicId
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Unable to save onboarding" }));
      setError(body.error ?? "Unable to save onboarding");
      setSaving(false);
      return;
    }

    router.replace("/feed");
    router.refresh();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionTitle
          eyebrow="Onboarding"
          title="Teach VShare what to remember."
          description="Pick the topics you care about and choose the one that should power your first feed."
        />

        <Card className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Display name</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>

          <div className="space-y-3">
            <div>
              <h2 className="font-black">Interests</h2>
              <p className="text-sm text-[var(--muted)]">Tap topics to include them in your memory profile.</p>
            </div>
            <TopicSelector
              topics={topics}
              selectedTopicIds={topicIds}
              selectedTopicId={selectedTopicId}
              onSelect={toggleTopic}
              multiSelect
            />
          </div>
        </Card>

        {topicIds.length > 0 ? (
          <Card className="space-y-3">
            <h2 className="font-black">Active feed topic</h2>
            <TopicSelector
              topics={topics.filter((topic) => topicIds.includes(topic.id))}
              selectedTopicId={selectedTopicId}
              onSelect={setSelectedTopicId}
              compact
            />
          </Card>
        ) : null}

        {error ? <Card className="border-red-500/30 bg-red-500/10 text-sm text-red-100">{error}</Card> : null}

        <Button className="w-full sm:w-auto" disabled={saving} onClick={submit}>
          {saving ? "Saving..." : "Finish onboarding"}
        </Button>
      </div>
    </AppShell>
  );
}
