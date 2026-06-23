"use client";

import { useEffect, useMemo, useState } from "react";
import { getProfile, selectTopic, updateProfile } from "@/lib/feed";
import type { Profile, Topic, UserTopicPreference } from "@/types/domain";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TopicSelector } from "@/components/topics/topic-selector";

export function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [preferences, setPreferences] = useState<UserTopicPreference[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await getProfile();
        setProfile(response.profile);
        setTopics(response.topics);
        setPreferences(response.preferences);
        setDisplayName(response.profile?.display_name ?? "");
      } catch (loadError) {
        setMessage(loadError instanceof Error ? loadError.message : "Unable to load profile");
      }
    }

    load();
  }, []);

  const selectedTopicId = profile?.selected_topic_id ?? null;
  const rememberedTopics = useMemo(
    () => preferences.filter((preference) => !preference.muted).slice(0, 6),
    [preferences]
  );

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await updateProfile({
        displayName,
        onboardingComplete: true
      });
      setProfile(response.profile);
      setMessage("Profile saved.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleTopicSelect(topicId: string) {
    setProfile((current) => (current ? { ...current, selected_topic_id: topicId } : current));
    const response = await selectTopic(topicId);
    setPreferences(response.preferences);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionTitle
          eyebrow="Profile"
          title="Your VShare memory."
          description="Manage your profile and active topic. Feed ranking continues to learn from views, likes, saves, and skips."
        />

        <Card className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Display name</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-black">{preferences.length}</p>
              <p className="text-sm text-[var(--muted)]">Remembered topics</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-black">{profile?.onboarding_complete ? "Yes" : "No"}</p>
              <p className="text-sm text-[var(--muted)]">Onboarding complete</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
              <p className="truncate text-2xl font-black">
                {topics.find((topic) => topic.id === selectedTopicId)?.name ?? "None"}
              </p>
              <p className="text-sm text-[var(--muted)]">Active topic</p>
            </div>
          </div>

          <Button disabled={saving} onClick={saveProfile}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-black">Active topic</h2>
          <TopicSelector
            topics={topics}
            preferences={preferences}
            selectedTopicId={selectedTopicId}
            onSelect={handleTopicSelect}
            compact
          />
        </Card>

        <Card>
          <h2 className="font-black">Highest memory weights</h2>
          <div className="mt-4 space-y-3">
            {rememberedTopics.length > 0 ? (
              rememberedTopics.map((preference) => (
                <div
                  key={preference.topic_id}
                  className="flex items-center justify-between rounded-2xl bg-white/5 p-3 text-sm"
                >
                  <span>{preference.topics?.name ?? preference.topic_id}</span>
                  <span className="font-semibold text-[var(--gold)]">{Number(preference.weight).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No topic memory yet. Start with onboarding or Explore.</p>
            )}
          </div>
        </Card>

        {message ? <Card className="text-sm text-[var(--muted)]">{message}</Card> : null}
      </div>
    </AppShell>
  );
}
