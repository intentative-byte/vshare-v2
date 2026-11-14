import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { HighImpactNotice } from "@/components/catalogue/high-impact-notice";
import { CardListItem } from "@/components/catalogue/card-list-item";
import { isDatabaseConfigured } from "@/platform/env";
import { findCategoryWithTopics, listPublishedCardsByTopic } from "@/modules/content/server";

type Params = { category: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  return { title: category.replace(/-/g, " ") };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category: slug } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Explore" title="Category" />
        <ErrorState
          title="The catalogue is unavailable"
          body="This instance has no catalogue service configured."
        />
      </>
    );
  }

  const found = await findCategoryWithTopics(slug);

  if (!found) {
    notFound();
  }

  const { category, topics } = found;
  const firstTopic = topics[0];
  const cards = firstTopic ? await listPublishedCardsByTopic(firstTopic.slug, 6) : [];

  return (
    <>
      <PageHeader eyebrow="Explore" title={category.name} description={category.description} />

      {category.isHighImpact ? <HighImpactNotice className="mb-4" /> : null}

      <h2 className="text-lg text-white">Topics</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-text"
          >
            {topic.name}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg text-white">
        {firstTopic ? `In ${firstTopic.name}` : "Resources"}
      </h2>

      {cards.length === 0 ? (
        <EmptyState
          title="Nothing published here yet"
          body="Resources appear here once they have been written up, checked and reviewed."
          action={{ href: "/explore", label: "Other categories" }}
        />
      ) : (
        <ul className="mt-3 grid gap-3">
          {cards.map((card) => (
            <li key={card.id}>
              <CardListItem card={card} />
            </li>
          ))}
        </ul>
      )}

      <FoundationNotice
        className="mt-6"
        milestone="Milestone 4"
        summary="Browsing every topic and a ranked feed across all of them arrive with the Value Feed."
      />

      <div className="mt-6">
        <ButtonLink href="/explore" variant="secondary">
          All categories
        </ButtonLink>
      </div>

      <p className="mt-6 text-sm text-silver-dim">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </>
  );
}
