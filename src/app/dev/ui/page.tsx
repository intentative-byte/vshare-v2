import { notFound } from "next/navigation";
import { areDevToolsEnabled } from "@/platform/env";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { TopicChip } from "@/components/ui/topic-chip";
import { Disclosure } from "@/components/ui/disclosure";
import { PageHeader } from "@/components/ui/page-header";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { SubmitForm } from "@/components/submissions/submit-form";
import { DataRights } from "@/components/account/data-rights";
import { seedCategories } from "@/modules/content";
import { ColumnChart, RankedBars, StatTile } from "@/components/admin/charts";
import { findMetric } from "@/modules/analytics";

export const metadata = { title: "Component gallery" };

/**
 * The component gallery: every primitive in every state, on one page.
 * Never served in production, and the target for visual and accessibility
 * checks (docs/VSHARES_DESIGN_SYSTEM.md section 5).
 */
export default function ComponentGalleryPage() {
  if (!areDevToolsEnabled()) {
    notFound();
  }

  return (
    <main id="content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Development only"
        title="Component gallery"
        description="Every primitive in the design system, in each of its states."
      />

      <section className="mt-8">
        <h2 className="text-lg text-white">Buttons</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg text-white">Fields</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <TextField id="gallery-email" label="Email address" type="email" placeholder="you@example.com" />
          <TextField
            id="gallery-handle"
            label="Handle"
            hint="Letters, numbers and underscores."
            defaultValue="not a handle!"
            error="Use letters, numbers and underscores only."
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg text-white">Cards and chips</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <CardTitle>Standard card</CardTitle>
            <CardBody className="mt-2">Used for most content on a surface.</CardBody>
            <Disclosure label="How this is counted">
              Every number in the product carries a note like this one.
            </Disclosure>
          </Card>
          <Card emphasis>
            <CardTitle>Emphasised card</CardTitle>
            <CardBody className="mt-2">A raised surface for one moment that matters.</CardBody>
          </Card>
          <TopicChip href="/explore" label="Budgeting" hint="Personal Finance" />
          <TopicChip href="/explore" label="Sleep" hint="Health and Wellbeing" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg text-white">States</h2>
        <div className="mt-3 grid gap-3">
          <LoadingRegion label="Loading example">
            <div className="grid gap-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </LoadingRegion>
          <EmptyState
            title="Nothing here yet"
            body="An empty state says what this is and offers one way forward."
            action={{ href: "/learn", label: "Go to Learn" }}
          />
          <ErrorState />
          <FoundationNotice
            milestone="Milestone 4"
            summary="This notice marks a destination that exists but is not finished."
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg text-white">Submission and data rights</h2>
        <p className="mt-2 text-sm text-silver-dim">
          The two Milestone 6 surfaces, rendered with the approved taxonomy and no account. They
          are here so the layout can be reviewed and checked for accessibility in an environment
          with no service; neither form can do anything without one.
        </p>
        <div className="mt-3 space-y-6">
          <SubmitForm
            groups={seedCategories.map((category) => ({
              category: category.name,
              topics: category.topics.map((topic) => ({ id: topic.slug, name: topic.name })),
            }))}
          />
          <DataRights />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg text-white">Charts</h2>
        <p className="mt-2 text-sm text-silver-dim">
          The marks the measurement dashboard is built from, drawn here with{" "}
          <strong className="text-text">made-up numbers so the shapes can be reviewed</strong>.
          Nobody has used VSHARES, so there are no real figures to show: these describe no
          person and no activity, and the dashboard itself shows nothing at all until a day has
          been computed.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <StatTile
            label="Cards completed"
            value="1,284"
            definition={findMetric("cards_completed")?.definition ?? ""}
            limit={findMetric("cards_completed")?.limit ?? ""}
          />
          <StatTile
            label="Median time to first win"
            value="1m 12s"
            definition="Median of 240 timings. Ninetieth percentile 4m 30s."
            limit={findMetric("first_completion_seconds")?.limit ?? ""}
          />
          <StatTile
            label="Session completion rate"
            value={null}
            unit="%"
            definition="No sessions were started in this period."
            limit="A rate with no denominator reads as missing, never as nought per cent."
          />
          <StatTile
            label="Applied learning"
            value={null}
            emptyLabel="Not measured"
            definition="Nothing in VSHARES collects this yet, so no number is shown and none is coming until something does."
            limit="It is not estimated from activity, because that would be activity wearing a different name."
          />
        </div>
        <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <ColumnChart
            points={[9, 14, 11, 21, 18, 24, 31, 27, 19, 22, 35, 29, 26, 33].map((value, i) => ({
              label: `${i + 1} Nov`,
              value,
            }))}
            caption="Columns: one series, no legend, only the peak labelled, 2px gaps and hairline gridlines."
          />
        </div>
        <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <RankedBars
            points={[
              { label: "Learning how to learn", value: 212 },
              { label: "Personal finance", value: 164 },
              { label: "Communication", value: 97 },
              { label: "Health & wellbeing", value: 41 },
              { label: "Entrepreneurship", value: null, suppressed: true },
            ]}
            caption="Ranked bars: one hue, largest first. The last row is below the suppression threshold, so it keeps its place and says it was withheld rather than vanishing."
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg text-white">Colour</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["bg", "bg-bg"],
            ["surface", "bg-surface"],
            ["raised", "bg-raised"],
            ["border-strong", "bg-border-strong"],
            ["gold", "bg-gold"],
            ["gold-bright", "bg-gold-bright"],
            ["gold-deep", "bg-gold-deep"],
            ["blue", "bg-blue"],
            ["success", "bg-success"],
            ["danger", "bg-danger"],
            ["silver", "bg-silver"],
            ["white", "bg-white"],
          ].map(([name, className]) => (
            <li key={name} className="rounded-[var(--radius-control)] border border-border p-2">
              <span className={`block h-10 rounded ${className}`} aria-hidden="true" />
              <span className="mt-2 block text-xs text-silver-dim">{name}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
