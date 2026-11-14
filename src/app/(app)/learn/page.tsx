import { PageHeader } from "@/components/ui/page-header";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <>
      <PageHeader
        eyebrow="Learn"
        title="Your value feed"
        description="Seven useful things, then a clear stopping point."
      />

      <FoundationNotice
        milestone="Milestone 4"
        summary="This is where the ranked session of value cards will appear, each one a real resource with takeaways you can use."
      />

      <Card className="mt-4">
        <CardTitle>What a session will look like</CardTitle>
        <CardBody className="mt-2">
          Seven cards, ranked for you and explainable. Each one carries its source, an estimate of how
          long it takes, and one to three takeaways. The session ends with what you finished and one
          next step.
        </CardBody>
      </Card>

      <ol className="mt-4 grid gap-3">
        {[
          "The catalogue of real, checked resources arrives in Milestone 3.",
          "Ranking, sessions and explanations arrive in Milestone 4.",
          "Completing a card, saving it and seeing progress arrive in Milestone 5.",
        ].map((step, index) => (
          <li
            key={step}
            className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-sm font-bold text-gold">
              {index + 1}
            </span>
            <span className="text-silver">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <ButtonLink href="/explore">Browse what is coming</ButtonLink>
      </div>
    </>
  );
}
