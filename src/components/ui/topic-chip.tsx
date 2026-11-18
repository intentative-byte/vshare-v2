import Link from "next/link";
import { cn } from "./cn";

export type TopicChipProps = {
  href: string;
  label: string;
  /** Short phrase shown under the label. Keep it to a few words. */
  hint?: string;
  className?: string;
};

/**
 * A topic entry point. Large enough to tap comfortably, and a link rather
 * than a button because it navigates.
 */
export function TopicChip({ href, label, hint, className }: TopicChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-16 flex-col justify-center rounded-[var(--radius-card)] border border-border",
        "bg-surface px-4 py-3 transition-colors duration-150 ease-[var(--ease-standard)]",
        "hover:border-gold/60 hover:bg-raised",
        className,
      )}
    >
      <span className="font-display font-semibold text-white group-hover:text-gold-bright">{label}</span>
      {hint ? <span className="mt-0.5 text-sm text-silver-dim">{hint}</span> : null}
    </Link>
  );
}
