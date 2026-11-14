"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { listSaved, setInteraction } from "@/modules/progress";

type SavedItem = {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  topicName: string;
  level: string;
  estimatedMinutes: number;
  savedAt: string;
};

type Sort = "recent" | "shortest" | "title";

/**
 * The saved library.
 *
 * Shows only what this viewer saved: the query runs as them and row-level
 * security does the filtering, so there is no way for it to return someone
 * else's library even if the query were wrong.
 */
export function SavedLibrary() {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [topic, setTopic] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await listSaved({});

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setItems(result.data as SavedItem[]);
      } else {
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const topics = useMemo(() => {
    const names = new Set((items ?? []).map((item) => item.topicName).filter(Boolean));
    return ["all", ...[...names].sort()];
  }, [items]);

  const visible = useMemo(() => {
    const filtered = (items ?? []).filter((item) => topic === "all" || item.topicName === topic);

    return [...filtered].sort((a, b) => {
      if (sort === "shortest") {
        return a.estimatedMinutes - b.estimatedMinutes;
      }

      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }

      return b.savedAt.localeCompare(a.savedAt);
    });
  }, [items, topic, sort]);

  async function remove(contentId: string) {
    setBusy(contentId);
    const result = await setInteraction({ contentId, kind: "save", value: false });

    if (result.ok) {
      setItems((current) => (current ?? []).filter((item) => item.contentId !== contentId));
    }

    setBusy(null);
  }

  if (failed) {
    return (
      <ErrorState title="Your library did not load" body="Trying again often fixes it.">
        <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
      </ErrorState>
    );
  }

  if (!items) {
    return (
      <LoadingRegion label="Loading your library">
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </LoadingRegion>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="When you save something from your feed it appears here, so you can come back to it."
        action={{ href: "/learn", label: "Go to Learn" }}
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-text">Topic</span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="min-h-11 rounded-[var(--radius-control)] border border-border-strong bg-raised px-3 text-text"
          >
            {topics.map((name) => (
              <option key={name} value={name}>
                {name === "all" ? "All topics" : name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-text">Sort by</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="min-h-11 rounded-[var(--radius-control)] border border-border-strong bg-raised px-3 text-text"
          >
            <option value="recent">Recently saved</option>
            <option value="shortest">Shortest first</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>

      <p className="tabular mb-3 text-sm text-silver-dim" role="status">
        {visible.length} of {items.length} saved
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing in that topic"
          body="Change the filter to see the rest of your library."
        />
      ) : (
        <ul className="grid gap-3">
          {visible.map((item) => (
            <li
              key={item.contentId}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
            >
              <Link href={`/c/${item.slug}`} className="block">
                <h2 className="font-display text-lg font-bold text-white">{item.title}</h2>
                <p className="mt-2 text-sm text-silver">{item.summary}</p>
              </Link>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="tabular flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-silver-dim uppercase">
                  <span>{item.topicName}</span>
                  <span>{item.level}</span>
                  <span>{item.estimatedMinutes} min</span>
                </p>
                <Button
                  variant="ghost"
                  disabled={busy === item.contentId}
                  onClick={() => void remove(item.contentId)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
