import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { Disclosure } from "@/components/ui/disclosure";

export const metadata = { title: "You" };

const sections = [
  {
    title: "Profile",
    body: "Your handle, display name and whether your profile is visible to anyone else. Private by default.",
    milestone: "Milestone 2",
  },
  {
    title: "Preference memory",
    body: "Everything VSHARES has learned about what you want to learn, shown in plain terms, with the ability to correct or reset any of it.",
    milestone: "Milestone 4",
  },
  {
    title: "Progress",
    body: "What you have actually finished: items completed, time spent learning, topics covered, active days.",
    milestone: "Milestone 5",
  },
  {
    title: "Privacy and your data",
    body: "Switch personalisation off, export everything held about you, or delete your account and its data.",
    milestone: "Milestone 6",
  },
];

export default function YouPage() {
  return (
    <>
      <PageHeader
        eyebrow="You"
        title="Your account"
        description="What VSHARES knows about you, and what you can change."
      />

      <FoundationNotice
        milestone="Milestone 2"
        summary="Accounts do not exist yet. Nothing here stores anything about you, because there is nowhere yet to store it."
      />

      <ul className="mt-4 grid gap-3">
        {sections.map((section) => (
          <li key={section.title}>
            <Card as="div">
              <CardTitle>{section.title}</CardTitle>
              <CardBody className="mt-2">{section.body}</CardBody>
              <p className="mt-3 text-sm text-silver-dim">Planned for {section.milestone}.</p>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-6" emphasis>
        <CardTitle>Three kinds of progress, kept apart</CardTitle>
        <CardBody className="mt-2">
          Finishing something, proving you understood it, and actually using it are different things,
          so VSHARES will never add them into one number.
        </CardBody>
        <Disclosure label="Why that matters">
          Someone who watches a hundred videos is not more capable than someone who finishes ten
          things and applies them. Activity, understanding and applied work are measured separately,
          and anything you tell us yourself is labelled as self-reported.
        </Disclosure>
      </Card>
    </>
  );
}
