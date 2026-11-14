import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { isDatabaseConfigured } from "@/platform/env";
import { listCategories } from "@/modules/content/server";

export const metadata = { title: "Explore" };

/** Categories and their topics, read from the database. */
export default async function ExplorePage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Explore" title="Categories" />
        <ErrorState
          title="The catalogue is unavailable"
          body="This instance has no catalogue service configured, so there is nothing to browse."
        />
      </>
    );
  }

  let categories;

  try {
    categories = await listCategories();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Explore" title="Categories" />
        <ErrorState body="The catalogue did not load. Please try again." />
      </>
    );
  }

  if (categories.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Explore" title="Categories" />
        <EmptyState
          title="Nothing to browse yet"
          body="The catalogue is being prepared. Categories will appear here once they are published."
          action={{ href: "/", label: "Back to home" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Categories"
        description="Areas to start with. More can be added at any time."
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/explore/${category.slug}`}
              className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors duration-150 hover:border-gold/60 hover:bg-raised"
            >
              <span className="font-display text-lg font-bold text-white">{category.name}</span>
              <span className="mt-2 text-sm text-silver">{category.description}</span>
              <span className="tabular mt-4 text-xs font-semibold tracking-wide text-silver-dim uppercase">
                {category.topicCount} {category.topicCount === 1 ? "topic" : "topics"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
