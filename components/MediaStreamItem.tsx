"use client";

import { memo, useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck, Check, Heart, Play, Repeat2, Send, ThumbsDown, Volume2 } from "lucide-react";
import { Button } from "@/components/Button";
import { getMediaPresentation, getMediaSteps } from "@/lib/media/rendering";
import type { FeedStreamItem } from "@/lib/feed-engine/stream";
import { cn, formatMinutes } from "@/lib/utils";

type MediaStreamItemProps = {
  item: FeedStreamItem;
  isSaved: boolean;
  isLiked: boolean;
  isCompleted: boolean;
  onStarted: (contentId: string) => void;
  onViewed: (contentId: string, position: number) => void;
  onWatchTime: (contentId: string, seconds: number) => void;
  onScrollAway: (contentId: string) => void;
  onComplete: (contentId: string) => void;
  onReplay: (contentId: string) => void;
  onToggleSaved: (contentId: string) => void;
  onToggleLiked: (contentId: string) => void;
  onShare: (contentId: string) => void;
  onNotInterested: (contentId: string) => void;
};

export const MediaStreamItem = memo(function MediaStreamItem({
  item,
  isSaved,
  isLiked,
  isCompleted,
  onStarted,
  onViewed,
  onWatchTime,
  onScrollAway,
  onComplete,
  onReplay,
  onToggleSaved,
  onToggleLiked,
  onShare,
  onNotInterested,
}: MediaStreamItemProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const visibleSinceRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);
  const hasViewedRef = useRef(false);
  const presentation = getMediaPresentation(item.content);
  const steps = getMediaSteps(item.content);

  useEffect(() => {
    const article = articleRef.current;

    if (!article) {
      return () => {};
    }

    function flushWatchTime(isScrollAway: boolean) {
      if (!visibleSinceRef.current) {
        return;
      }

      const elapsedSeconds = Math.max(1, (Date.now() - visibleSinceRef.current) / 1000);
      visibleSinceRef.current = null;
      onWatchTime(item.content.id, elapsedSeconds);

      if (isScrollAway && elapsedSeconds < Math.max(6, item.content.durationMinutes * 12)) {
        onScrollAway(item.content.id);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);

        if (isVisible) {
          visibleSinceRef.current = visibleSinceRef.current ?? Date.now();

          if (!hasStartedRef.current) {
            hasStartedRef.current = true;
            onStarted(item.content.id);
          }

          if (!hasViewedRef.current) {
            hasViewedRef.current = true;
            onViewed(item.content.id, window.scrollY);
          }

          return;
        }

        flushWatchTime(true);
      },
      { threshold: 0.72 },
    );

    observer.observe(article);

    return () => {
      flushWatchTime(false);
      observer.disconnect();
    };
  }, [item.content.durationMinutes, item.content.id, onScrollAway, onStarted, onViewed, onWatchTime]);

  async function handleShare() {
    onShare(item.content.id);

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.content.title,
          text: item.content.summary,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard?.writeText(`${item.content.title}\n${item.content.summary}`);
    } catch {
      // Sharing can be cancelled or unavailable; the intent is still recorded.
    }
  }

  return (
    <article
      ref={articleRef}
      className="min-h-[calc(100svh-8rem)] snap-start overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-soft"
    >
      <div className={cn("relative flex min-h-[52svh] flex-col justify-between bg-gradient-to-br p-5 text-white", presentation.visualTone)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%)]" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
            {presentation.eyebrow}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
            {item.lane}
          </span>
        </div>
        <div className="relative z-10">
          <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-white/15">
            {presentation.renderer === "audio" ? <Volume2 className="size-8" /> : <Play className="size-8" />}
          </div>
          <p className="text-sm font-bold text-violet-100">{item.content.source.name}</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{item.content.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100">{item.content.summary}</p>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap gap-2">
            {item.content.interests.map((interest) => (
              <span key={interest} className="rounded-full bg-mist px-3 py-1 text-xs font-black text-slate-600">
                {interest}
              </span>
            ))}
            {item.isNew ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">New</span> : null}
            {item.isUnseen ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">Unseen</span> : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-black text-violet-700">0{index + 1}</p>
                <p className="mt-1 font-black">{step}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-500">
            {presentation.primaryAction} · {formatMinutes(item.content.durationMinutes)} · {item.content.contentType.replace("_", " ")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-44 lg:grid-cols-1">
          <Button type="button" onClick={() => onComplete(item.content.id)} disabled={isCompleted} className="w-full">
            <Check className="mr-2 size-4" />
            {isCompleted ? "Done" : "Complete"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onToggleSaved(item.content.id)} className="w-full">
            {isSaved ? <BookmarkCheck className="mr-2 size-4" /> : <Bookmark className="mr-2 size-4" />}
            Save
          </Button>
          <Button type="button" variant={isLiked ? "primary" : "secondary"} onClick={() => onToggleLiked(item.content.id)} className="w-full">
            <Heart className="mr-2 size-4" />
            Like
          </Button>
          <Button type="button" variant="ghost" onClick={() => onReplay(item.content.id)} className="w-full">
            <Repeat2 className="mr-2 size-4" />
            Replay
          </Button>
          <Button type="button" variant="ghost" onClick={handleShare} className="w-full">
            <Send className="mr-2 size-4" />
            Share
          </Button>
          <Button type="button" variant="ghost" onClick={() => onNotInterested(item.content.id)} className="w-full">
            <ThumbsDown className="mr-2 size-4" />
            Not for me
          </Button>
        </div>
      </div>
    </article>
  );
});
