"use client";

import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { Button } from "@/components/Button";
import { LearningCard } from "@/components/LearningCard";
import {
  getGroupedSavedLibrary,
  markContentCompleted,
  markContentShared,
  markContentSkipped,
  markContentViewed,
  recordWatchTime,
  toggleSavedContent,
  useLearningState,
} from "@/lib/learning";

export function SavedExperience() {
  const learningState = useLearningState();
  const savedLibrary = getGroupedSavedLibrary(learningState);
  const savedCount = savedLibrary.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-ink p-5 text-white shadow-soft sm:p-6">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-white/10 p-3 text-violet-200">
            <Bookmark className="size-6" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">Saved</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Your learning queue</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Keep high-signal items here and mark them done when they become part of your progress.
            </p>
          </div>
        </div>
      </section>

      {savedCount ? (
        <div className="grid gap-6">
          {savedLibrary.map((group) => (
            <section key={group.topic} className="grid gap-4">
              <div className="flex items-center justify-between rounded-[1.5rem] bg-white px-5 py-4 shadow-soft">
                <h2 className="text-2xl font-black tracking-tight">{group.topic}</h2>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-black text-violet-700">
                  {group.items.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((content) => (
                  <LearningCard
                    key={content.id}
                    content={content}
                    isSaved={learningState.savedContentIds.includes(content.id)}
                    isViewed={learningState.viewedContentIds.includes(content.id)}
                    isCompleted={learningState.completedContentIds.includes(content.id)}
                    onToggleSaved={toggleSavedContent}
                    onViewed={markContentViewed}
                    onWatchTime={recordWatchTime}
                    onComplete={markContentCompleted}
                    onSkip={markContentSkipped}
                    onShare={markContentShared}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/80 bg-white p-6 text-center shadow-soft">
          <Search className="mx-auto size-10 text-violet-600" />
          <h2 className="mt-4 text-2xl font-black tracking-tight">No saved items yet</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">
            Save cards from your feed to create a focused queue for later.
          </p>
          <Link href="/feed">
            <Button type="button" className="mt-5">
              Go to feed
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
