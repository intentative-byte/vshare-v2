import Link from "next/link";
import { BrandLockup } from "@/components/shell/brand";
import { ButtonLink } from "@/components/ui/button";
import { TopicChip } from "@/components/ui/topic-chip";
import { featuredTopicSlugs, findTopic } from "@/modules/content";

export const metadata = {
  title: "Stop doomscrolling. Start value scrolling.",
};

const featuredTopics = featuredTopicSlugs
  .map((slug) => findTopic(slug))
  .filter((topic): topic is NonNullable<typeof topic> => topic !== undefined);

/**
 * The public home page: the promise, then a way in.
 *
 * Choosing a topic is how a visitor starts, with no sign-up wall. The card
 * each topic opens arrives with the catalogue in Milestone 3 and the first
 * learning win in Milestone 5; today a topic leads to its place in Explore.
 */
export default function HomePage() {
  return (
    <div className="gradient-aura min-h-svh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLockup instanceId="home" />
        <Link href="/learn" className="text-sm font-semibold text-silver hover:text-white">
          Open the app
        </Link>
      </header>

      <main id="content" className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <section className="pt-10 pb-12 sm:pt-16">
          <p className="font-display text-sm font-semibold tracking-[0.22em] text-gold uppercase">
            An operating system for becoming
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl text-white sm:text-6xl">
            Stop doomscrolling.
            <br />
            Start value scrolling.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-silver">
            VSHARES is not designed to keep you scrolling. It is designed to move you forward: short,
            genuinely useful things to learn, chosen for what you want to get better at.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/learn" size="lg">
              Start learning
            </ButtonLink>
            <ButtonLink href="/explore" size="lg" variant="secondary">
              Browse topics
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="pick-a-topic">
          <h2 id="pick-a-topic" className="text-2xl text-white">
            What do you want to get better at?
          </h2>
          <p className="mt-2 text-silver">
            Pick a topic to begin. No account needed to start.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredTopics.map((topic) => (
              <li key={topic.slug}>
                <TopicChip
                  href={`/explore/${topic.categorySlug}`}
                  label={topic.name}
                  hint={topic.categoryName}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Useful, not endless",
              body: "A session is seven things long and ends with a clear next step, not more feed.",
            },
            {
              title: "It explains itself",
              body: "Every recommendation can tell you why you are seeing it, and you can switch personalisation off.",
            },
            {
              title: "Progress you can trust",
              body: "Progress counts what you have actually finished. Time spent scrolling is not an achievement.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
              <h3 className="text-base text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-silver">{item.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-silver-dim sm:px-6">
          <p>VSHARES</p>
          <p>Early build. Features are being added milestone by milestone.</p>
        </div>
      </footer>
    </div>
  );
}
