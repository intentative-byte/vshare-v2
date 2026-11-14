import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { categories } from "@/modules/content";

export const metadata = { title: "Explore" };

/**
 * Categories and their topics. Real navigation over the approved taxonomy;
 * the cards inside each topic arrive with the catalogue in Milestone 3.
 */
export default function ExplorePage() {
  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Categories"
        description="Eight areas to start with. More can be added at any time."
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/explore/${category.slug}`}
              className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors duration-150 hover:border-gold/60 hover:bg-raised"
            >
              <span className="font-display text-lg font-bold text-white">{category.name}</span>
              <span className="mt-2 text-sm text-silver">{category.description}</span>
              <span className="tabular mt-4 text-xs font-semibold tracking-wide text-silver-dim uppercase">
                {category.topics.length} topics
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
