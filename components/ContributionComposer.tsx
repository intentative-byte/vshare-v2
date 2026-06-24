"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/Button";
import { InterestPicker } from "@/components/InterestPicker";
import { createContribution } from "@/lib/learning";
import type { ContributionType, Interest } from "@/lib/types";

const contributionTypes: Array<{ value: ContributionType; label: string }> = [
  { value: "short_insight", label: "Short insight" },
  { value: "framework", label: "Framework" },
  { value: "thread", label: "Thread" },
  { value: "resource_link", label: "Resource link" },
  { value: "article_summary", label: "Article summary" },
  { value: "learning_note", label: "Learning note" },
];

export function ContributionComposer() {
  const [type, setType] = useState<ContributionType>("short_insight");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [topics, setTopics] = useState<Interest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit() {
    const result = createContribution({
      type,
      title,
      body,
      url: url || null,
      topics,
    });

    if (!result.ok) {
      setMessage(
        result.error === "rate_limited"
          ? "You are sharing quickly. Try again later."
          : result.error === "duplicate"
            ? "This looks like something you already shared."
            : "Add more detail or a clearer topic before sharing.",
      );
      return;
    }

    setTitle("");
    setBody("");
    setUrl("");
    setTopics([]);
    setMessage("Shared with the learning network.");
  }

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-ink p-3 text-white">
          <Send className="size-5" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Contribution loop</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Share what you learned</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Add an insight, resource, summary, or framework. Quality checks keep the network useful.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ContributionType)}
          className="min-h-12 rounded-2xl border border-slate-200 px-4 font-semibold outline-none"
        >
          {contributionTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What did you learn?"
          rows={4}
          className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Optional link, video, article, PDF, or research URL"
          className="min-h-12 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
        <InterestPicker selectedInterests={topics} onChange={setTopics} />
        <Button type="button" onClick={handleSubmit} disabled={!title.trim() || !body.trim() || topics.length === 0} className="w-full py-3">
          Share resource
        </Button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-mist p-3 text-sm font-bold text-slate-600">{message}</p> : null}
    </section>
  );
}
