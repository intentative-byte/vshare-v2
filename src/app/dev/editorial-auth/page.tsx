import { notFound } from "next/navigation";
import { areDevToolsEnabled } from "@/platform/env";
import { PageHeader } from "@/components/ui/page-header";
import {
  AuthenticatedEditorialWorkbench,
  type BoardItem,
  type Reviewer,
} from "@/components/editorial/authenticated-editorial-workbench";

export const metadata = { title: "Authenticated workbench (preview)" };

/**
 * Development-only ACCESSIBILITY PREVIEW of the authenticated editorial
 * workbench. It renders the real component in preview mode with illustrative,
 * non-persisting data so the markup can be checked for accessibility without an
 * auth service or database. Never served in production (404). The real,
 * reviewer-only, database-backed surface is /admin/editorial. No decision is
 * recorded here and nothing is published.
 */
const SAMPLE_REVIEWER: Reviewer = {
  userId: "00000000-0000-0000-0000-0000000000aa",
  displayName: "Sample Reviewer",
  roles: ["moderator"],
};

const SAMPLE_ITEMS: BoardItem[] = [
  {
    id: "00000000-0000-0000-0000-0000000000b1",
    slug: "sample-high-impact",
    status: "draft",
    isHighImpact: true,
    currentVersionId: "00000000-0000-0000-0000-0000000000c1",
    topicName: "Sample topic",
    sourceUrl: "https://example.com/source",
    linkCheckedAt: null,
    version: {
      title: "A sample high-impact card for accessibility preview",
      summary:
        "This is illustrative text only, rendered so the workbench markup can be checked for accessibility. It is not real content.",
      takeaways: ["An illustrative takeaway."],
      nextStep: "This preview records nothing.",
      sourceName: "Example Publisher",
      sourceAuthor: null,
    },
    decisions: [
      {
        id: "00000000-0000-0000-0000-0000000000d1",
        contentVersionId: "00000000-0000-0000-0000-0000000000c1",
        reviewerId: "00000000-0000-0000-0000-0000000000ee",
        decision: "approve",
        rationale: "Illustrative first approval, shown only to preview the audit ledger layout.",
        evidenceRef: null,
        publicationEligible: false,
        decidedAt: "2026-11-18T10:00:00.000Z",
        onCurrentRevision: true,
      },
    ],
    publicationEligible: false,
    ledgerValid: true,
    requiredApprovers: 2,
    approversOnCurrent: 1,
    viewerApprovedCurrent: false,
  },
];

export default function AuthenticatedWorkbenchPreview() {
  if (!areDevToolsEnabled()) {
    notFound();
  }
  return (
    <>
      <PageHeader
        eyebrow="Developer"
        title="Authenticated workbench (preview)"
        description="Accessibility preview only. The real surface is /admin/editorial (staff-only, database-backed). Development-only; records nothing."
      />
      <AuthenticatedEditorialWorkbench items={SAMPLE_ITEMS} reviewer={SAMPLE_REVIEWER} mode="preview" />
    </>
  );
}
