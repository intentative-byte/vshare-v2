import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BrandLockup } from "@/components/shell/brand";
import { ButtonLink } from "@/components/ui/button";
import { HighImpactNotice } from "@/components/catalogue/high-impact-notice";
import { isDatabaseConfigured } from "@/platform/env";
import { findPublishedCard } from "@/modules/content/server";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;

  if (!isDatabaseConfigured()) {
    return { title: "Unavailable" };
  }

  const card = await findPublishedCard(slug);

  return card ? { title: card.title, description: card.summary } : { title: "Not found" };
}

/**
 * A value card, in public.
 *
 * Shareable without an account, and always attributed: the publisher, the
 * author where we know one, and a link to the original. VSHARES summarises
 * and points at the source; it never reproduces it.
 */
export default async function CardPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  if (!isDatabaseConfigured()) {
    notFound();
  }

  const card = await findPublishedCard(slug);

  if (!card) {
    notFound();
  }

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLockup instanceId="card" />
        <Link href="/learn" className="text-sm font-semibold text-silver hover:text-white">
          Open the app
        </Link>
      </header>

      <main id="content" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <article>
          <p className="tabular flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-gold uppercase">
            <span>{card.topic.name}</span>
            <span className="text-silver-dim">{card.level}</span>
            <span className="text-silver-dim">{card.estimatedMinutes} min</span>
            <span className="text-silver-dim">{card.format}</span>
          </p>

          <h1 className="mt-3 text-3xl text-white sm:text-4xl">{card.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-silver">{card.summary}</p>

          {card.isHighImpact ? <HighImpactNotice className="mt-6" /> : null}

          <section className="mt-8" aria-labelledby="takeaways">
            <h2 id="takeaways" className="text-lg text-white">
              What you take away
            </h2>
            <ul className="mt-3 grid gap-3">
              {card.takeaways.map((takeaway, index) => (
                <li
                  key={takeaway}
                  className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4"
                >
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-sm font-bold text-gold">
                    {index + 1}
                  </span>
                  <span className="text-text">{takeaway}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-[var(--radius-card)] border border-gold/30 bg-raised p-5">
            <h2 className="text-lg text-white">Your next step</h2>
            <p className="mt-2 text-text">{card.nextStep}</p>
          </section>

          <section className="mt-8 border-t border-border pt-6" aria-labelledby="source">
            <h2 id="source" className="text-sm font-semibold tracking-wide text-silver-dim uppercase">
              Source
            </h2>
            <p className="mt-2 text-text">
              {card.source.author ? `${card.source.author}, ` : ""}
              <span className="font-semibold text-white">{card.source.name}</span>
            </p>
            <p className="mt-1 text-sm break-words text-silver-dim">{card.source.url}</p>

            {card.isAiAssisted ? (
              <p className="mt-3 text-sm text-silver-dim">
                This summary was drafted with AI assistance and reviewed by a person before
                publication.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={card.source.url}>Read the original</ButtonLink>
              <ButtonLink href={`/explore/${card.categorySlug}`} variant="secondary">
                More in this category
              </ButtonLink>
            </div>
            <p className="mt-3 text-xs text-silver-dim">
              VSHARES summarises and links. The original remains the work of its publisher.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
