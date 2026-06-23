"use client";

import { useEffect, useRef } from "react";
import { Bookmark, Clock, ExternalLink, Heart, ThumbsDown } from "lucide-react";
import type { FeedItem } from "@/types/domain";
import { sendContentEvent } from "@/lib/feed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ContentCard({ item, onMemoryChange }: { item: FeedItem; onMemoryChange: (id: string) => void }) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const trackedViewRef = useRef(false);
  const visibleSinceRef = useRef<number | null>(null);
  const watchSecondsRef = useRef(0);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const flushWatchTime = () => {
      if (visibleSinceRef.current) {
        watchSecondsRef.current += Math.round((Date.now() - visibleSinceRef.current) / 1000);
        visibleSinceRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (!trackedViewRef.current) {
            trackedViewRef.current = true;
            void sendContentEvent({ contentId: item.id, eventType: "view" }).catch(() => undefined);
          }

          visibleSinceRef.current = visibleSinceRef.current ?? Date.now();
          return;
        }

        flushWatchTime();
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      flushWatchTime();

      if (watchSecondsRef.current > 2) {
        void sendContentEvent({
          contentId: item.id,
          eventType: "watch_time",
          watchTimeSeconds: watchSecondsRef.current
        }).catch(() => undefined);
      }
    };
  }, [item.id]);

  async function track(action: "view" | "save" | "like" | "skip") {
    await sendContentEvent({
      contentId: item.id,
      eventType: action
    });

    if (action === "skip") {
      onMemoryChange(item.id);
    }
  }

  return (
    <Card ref={cardRef} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
        <span>{item.topic_name}</span>
        <span className="text-[var(--muted)]">/</span>
        <span className="text-[var(--muted)]">{item.source_name}</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black leading-tight tracking-tight text-[var(--foreground)]">
          {item.title}
        </h2>
        <p className="text-sm leading-6 text-[var(--muted)]">{item.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <Clock size={14} />
          {Math.max(1, Math.round(item.duration_seconds / 60))} min
        </span>
        <span>Quality {Number(item.quality_score).toFixed(1)}</span>
        <span>Popularity {Number(item.popularity_score).toFixed(1)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="gap-2" onClick={() => track("view")}>
          Mark viewed
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => track("save")}>
          <Bookmark size={16} />
          Save
        </Button>
        <Button variant="secondary" className="gap-2" onClick={() => track("like")}>
          <Heart size={16} />
          Like
        </Button>
        <Button variant="danger" className="gap-2" onClick={() => track("skip")}>
          <ThumbsDown size={16} />
          Skip
        </Button>
        {item.source_url ? (
          <a
            href={item.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[var(--gold)] hover:bg-white/5"
          >
            Open
            <ExternalLink size={15} />
          </a>
        ) : null}
      </div>
    </Card>
  );
}
