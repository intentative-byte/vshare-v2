import { PageHeader } from "@/components/ui/page-header";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Path" };

export default function PathPage() {
  return (
    <>
      <PageHeader
        eyebrow="Path"
        title="Your next step"
        description="One recommendation at a time, with the reason it was chosen."
      />

      <FoundationNotice
        milestone="Milestone 4"
        summary="This is where VAI will show your next best thing to learn, and what it is based on."
      />

      <Card className="mt-4">
        <CardTitle>How this tab will work</CardTitle>
        <CardBody className="mt-2">
          Path holds one recommendation, your progress for the week and the topics you have chosen. It
          will never show a streak you can lose or pressure you to return.
        </CardBody>
        <Disclosure label="What it will be based on">
          Topics you choose, what you have finished, what you saved and did not open, and what you
          marked as not useful. All of it visible and editable on the You tab.
        </Disclosure>
      </Card>

      <div className="mt-6">
        <ButtonLink href="/explore" variant="secondary">
          Choose topics in Explore
        </ButtonLink>
      </div>
    </>
  );
}
