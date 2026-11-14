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
