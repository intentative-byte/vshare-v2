import { cn } from "@/components/ui/cn";

/**
 * Shown on finance, health and legal content.
 *
 * These categories are reviewed by someone other than the person who wrote
 * the card up, and the reader is told plainly that this is information
 * rather than advice for their situation.
 */
export function HighImpactNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-[var(--radius-card)] border border-gold/40 bg-gold/5 p-4 text-sm text-text",
        className,
      )}
    >
      <strong className="font-semibold text-white">Educational, not advice.</strong> Everything
      published here is reviewed by a person before it goes live, and is general information rather
      than guidance for your situation.
    </p>
  );
}
