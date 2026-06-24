"use client";

import { useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Clock, PlayCircle, Send, XCircle } from "lucide-react";
import { Button } from "@/components/Button";
import type { LearningContent } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

type LearningCardProps = {
  content: LearningContent;
  isSaved: boolean;
  isViewed: boolean;
  isCompleted: boolean;
  lane?: "personalized" | "discovery";
  reasons?: string[];
  onToggleSaved: (contentId: string) => void;
  onViewed: (contentId: string, position: number) => void;
  onWatchTime: (contentId: string, seconds: number) => void;
  onComplete: (contentId: string) => void;
  onSkip: (contentId: string) => void;
  onShare: (contentId: string) => void;
};

export function LearningCard({
  content,
  isSaved,
  isViewed,
  isCompleted,
  lane,
  reasons = [],
  onToggleSaved,
  onViewed,
  onWatchTime,
  onComplete,
  onSkip,
  onShare,
}: LearningCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const hasRecordedViewRef = useRef(false);
  const visibleSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const card = cardRef.current;

    if (!card) {
      return () => {};
    }

    function flushWatchTime() {
      if (!visibleSinceRef.current) {
        return;
      }

      const elapsedSeconds = (Date.now() - visibleSinceRef.current) / 1000;
      visibleSinceRef.current = null;
      onWatchTime(content.id, elapsedSeconds);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);

        if (isVisible) {
          visibleSinceRef.current = visibleSinceRef.current ?? Date.now();

          if (!hasRecordedViewRef.current) {
            hasRecordedViewRef.current = true;
            onViewed(content.id, window.scrollY);
          }

          return;
        }

        flushWatchTime();
      },
      { threshold: 0.55 },
    );

    observer.observe(card);

    return () => {
      flushWatchTime();
      observer.disconnect();
    };
  }, [content.id, onViewed, onWatchTime]);

  async function handleShare() {
    onShare(content.id);

    const sharePayload = {
      title: content.title,
      text: content.summary,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(sharePayload);
      return;
    }

    await navigator.clipboard?.writeText(`${content.title}\n${content.summary}`);
  }

  return (
    <article
      ref={cardRef}
      className={cn(
        "overflow-hidden rounded-[1.75rem] border bg-white shadow-soft transition",
        isCompleted ? "border-slate-100 opacity-70" : "border-white/80",
      )}
    >
      <div className="aspect-video bg-ink p-5 text-white">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
              {content.format}
            </span>
            {lane ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
                {lane}
              </span>
            ) : null}
            {content.media.kind === "video" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-300 px-3 py-1 text-xs font-black text-ink">
                <PlayCircle className="size-3.5" />
                Video slot
              </span>
            ) : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-100">{content.sourceLabel}</p>
            <h2 className="mt-2 line-clamp-2 text-2xl font-black tracking-tight">{content.title}</h2>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {[...content.interests, ...reasons].map((interest) => (
            <span key={interest} className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-slate-600">
              {interest}
            </span>
          ))}
        </div>

        <p className="mt-4 leading-7 text-slate-600">{content.summary}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {formatMinutes(content.durationMinutes)}
          </span>
          <span className="capitalize">{content.level}</span>
          {isCompleted ? (
            <span className="text-emerald-700">Completed</span>
          ) : isViewed ? (
            <span className="text-violet-700">Viewed</span>
          ) : (
            <span>Unseen</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => onToggleSaved(content.id)} className="w-full">
            {isSaved ? <BookmarkCheck className="mr-2 size-4" /> : <Bookmark className="mr-2 size-4" />}
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button type="button" onClick={() => onComplete(content.id)} disabled={isCompleted} className="w-full">
            <CheckCircle2 className="mr-2 size-4" />
            {isCompleted ? "Done" : "Complete"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onSkip(content.id)} disabled={isCompleted} className="w-full">
            <XCircle className="mr-2 size-4" />
            Skip
          </Button>
          <Button type="button" variant="ghost" onClick={handleShare} className="w-full">
            <Send className="mr-2 size-4" />
            Share
          </Button>
        </div>
      </div>
    </article>
  );
}
