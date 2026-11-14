import { cn } from "./cn";

export type FoundationNoticeProps = {
  /** The milestone that delivers the real screen, e.g. "Milestone 4". */
  milestone: string;
  /** What this destination will do, in one sentence. */
  summary: string;
  className?: string;
};

/**
 * Marks a navigation destination that exists but is not yet built.
 *
 * Every tab in the shell has a real route from the foundation milestone
 * onwards, and an unfinished one says so plainly rather than looking
 * complete. These notices are removed as each milestone lands.
 */
export function FoundationNotice({ milestone, summary, className }: FoundationNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-blue/40 bg-blue/5 p-4",
        className,
      )}
    >
      <p className="text-sm font-semibold tracking-wide text-blue uppercase">Not built yet</p>
      <p className="mt-2 text-text">{summary}</p>
      <p className="mt-2 text-sm text-silver-dim">Planned for {milestone}.</p>
    </div>
  );
}
