"use client";

import { Bookmark, BookmarkCheck, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/Button";
import type { LearningContent } from "@/lib/types";
import { cn, formatMinutes } from "@/lib/utils";

type LearningCardProps = {
  content: LearningContent;
  isSaved: boolean;
  isViewed: boolean;
  onToggleSaved: (contentId: string) => void;
  onMarkViewed: (contentId: string) => void;
};

export function LearningCard({ content, isSaved, isViewed, onToggleSaved, onMarkViewed }: LearningCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.75rem] border bg-white shadow-soft transition",
        isViewed ? "border-slate-100 opacity-80" : "border-white/80",
      )}
    >
      <div className="aspect-video bg-ink p-5 text-white">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
              {content.format}
            </span>
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
          {content.interests.map((interest) => (
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
          {isViewed ? <span className="text-emerald-700">Viewed</span> : <span>Unseen</span>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => onToggleSaved(content.id)} className="w-full">
            {isSaved ? <BookmarkCheck className="mr-2 size-4" /> : <Bookmark className="mr-2 size-4" />}
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button type="button" onClick={() => onMarkViewed(content.id)} disabled={isViewed} className="w-full">
            <CheckCircle2 className="mr-2 size-4" />
            {isViewed ? "Done" : "Mark done"}
          </Button>
        </div>
      </div>
    </article>
  );
}
