import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { ButtonLink } from "@/components/ui/button";
import { findCategory } from "@/modules/content";

type Params = { category: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { category: slug } = await params;
  const category = findCategory(slug);

  return { title: category?.name ?? "Explore" };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category: slug } = await params;
  const category = findCategory(slug);

  if (!category) {
    notFound();
  }

  return (
    <>
      <PageHeader eyebrow="Explore" title={category.name} description={category.description} />

      {category.isHighImpact ? (
        <p className="mb-4 rounded-[var(--radius-card)] border border-gold/40 bg-gold/5 p-4 text-sm text-text">
          <strong className="font-semibold text-white">Educational, not advice.</strong> Everything
          published here is reviewed by a person before it goes live, and is general information rather
          than guidance for your situation.
        </p>
      ) : null}

      <h2 className="text-lg text-white">Topics</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {category.topics.map((topic) => (
          <li
            key={topic.slug}
            className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-text"
          >
            {topic.name}
          </li>
        ))}
      </ul>

      <FoundationNotice
        className="mt-6"
        milestone="Milestone 3"
        summary="Choosing a topic will open the resources curated for it. The catalogue is being prepared and reviewed before anything is published."
      />

      <div className="mt-6">
        <ButtonLink href="/explore" variant="secondary">
          All categories
        </ButtonLink>
      </div>
    </>
  );
}
