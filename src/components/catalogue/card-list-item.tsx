import Link from "next/link";
import type { Card } from "@/modules/content";

/** A value card in a list: enough to decide whether to open it. */
export function CardListItem({ card }: { card: Card }) {
  return (
    <Link
      href={`/c/${card.slug}`}
      className="block rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors duration-150 hover:border-gold/60 hover:bg-raised"
    >
      <h3 className="font-display text-lg font-bold text-white">{card.title}</h3>
      <p className="mt-2 text-sm text-silver">{card.summary}</p>
      <p className="tabular mt-4 flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-silver-dim uppercase">
        <span>{card.level}</span>
        <span>{card.estimatedMinutes} min</span>
        <span>{card.source.name}</span>
      </p>
    </Link>
  );
}
