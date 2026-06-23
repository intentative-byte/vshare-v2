import Link from "next/link";
import { ArrowUpRight, Clock, Sparkles } from "lucide-react";
import type { FeedItem, Post } from "@/lib/types";
import { formatDate, formatMinutes } from "@/lib/utils";

type ContentCardProps = {
  post: Post | FeedItem;
};

export function ContentCard({ post }: ContentCardProps) {
  const relevance = "relevance" in post ? post.relevance : null;
  const author = post.profile?.full_name ?? post.profile?.username ?? "VShare member";

  return (
    <article className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{author}</p>
          <p className="text-xs text-slate-400">{formatDate(post.created_at)}</p>
        </div>
        {relevance ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            <Sparkles className="size-3.5" />
            {relevance}% match
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {post.topics.map((topic) => (
            <span key={topic} className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-slate-600">
              {topic}
            </span>
          ))}
        </div>
        <h2 className="text-2xl font-black tracking-tight">{post.title}</h2>
        <p className="leading-7 text-slate-600">{post.summary}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {formatMinutes(post.estimated_minutes)}
          </span>
          <span className="capitalize">{post.difficulty}</span>
          <span className="capitalize">{post.content_type}</span>
        </div>
        {post.url ? (
          <Link
            href={post.url}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            target="_blank"
            rel="noreferrer"
          >
            Open resource
            <ArrowUpRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
