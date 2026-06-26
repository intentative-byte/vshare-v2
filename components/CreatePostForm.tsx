"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { emptyPostDraft, topicOptions } from "@/lib/data";

export function CreatePostForm() {
  const router = useRouter();
  const [draft, setDraft] = useState(emptyPostDraft);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitPost() {
    setStatus(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        setError("Sign in to publish resources, or continue in demo mode from the login page.");
        return;
      }

      setDraft(emptyPostDraft);
      setStatus("Resource shared with your network.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <Plus className="size-5" />
        </span>
        <div>
          <h2 className="font-black tracking-tight">Share a resource</h2>
          <p className="text-sm text-slate-500">Add signal to the collective learning graph.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <input
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          placeholder="Title"
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <textarea
          value={draft.summary}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          placeholder="Why is this useful?"
          rows={4}
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <input
          value={draft.url ?? ""}
          onChange={(event) => setDraft({ ...draft, url: event.target.value })}
          placeholder="https://..."
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={draft.content_type}
            onChange={(event) =>
              setDraft({
                ...draft,
                content_type: event.target.value as typeof draft.content_type,
              })
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          >
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="course">Course</option>
            <option value="podcast">Podcast</option>
            <option value="thread">Thread</option>
          </select>
          <select
            value={draft.difficulty}
            onChange={(event) =>
              setDraft({
                ...draft,
                difficulty: event.target.value as typeof draft.difficulty,
              })
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input
            type="number"
            min="1"
            value={draft.estimated_minutes}
            onChange={(event) => setDraft({ ...draft, estimated_minutes: Number(event.target.value) })}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
        </div>
        <select
          value={draft.topics[0] ?? ""}
          onChange={(event) => setDraft({ ...draft, topics: event.target.value ? [event.target.value] : [] })}
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
        >
          <option value="">Choose a primary topic</option>
          {topicOptions.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        <Button
          type="button"
          disabled={isPending || !draft.title || !draft.summary || draft.topics.length === 0}
          onClick={submitPost}
        >
          Publish
        </Button>
      </div>

      {status ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{status}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
