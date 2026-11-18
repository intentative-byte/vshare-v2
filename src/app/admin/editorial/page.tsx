import {
  listEditorialReviewItems,
  listEditorialDecisions,
  getEditorialPublicationEligible,
  getEditorialLedgerValid,
} from "@/modules/content/server";
import { readMyProfile } from "@/modules/profiles";
import {
  AuthenticatedEditorialWorkbench,
  type BoardItem,
  type BoardDecision,
} from "@/components/editorial/authenticated-editorial-workbench";

export const metadata = { title: "Editorial review" };

/**
 * The AUTHENTICATED Editorial Review Workbench.
 *
 * Reviewer-only: the admin layout denies anyone without a moderator/admin role
 * server-side (notFound). This reads real persisted content and the real
 * decision ledger from PostgreSQL (through row-level security), shows the
 * signed-in reviewer's identity, and records decisions through the authenticated
 * server action. It never writes from the browser, never computes eligibility in
 * the browser, and never publishes.
 */
export default async function EditorialReviewPage() {
  // The admin layout already guaranteed a staff viewer; read the profile for the
  // reviewer's display identity.
  const profile = await readMyProfile();
  const reviewer = {
    userId: profile?.userId ?? "",
    displayName: profile?.displayName ?? profile?.handle ?? "reviewer",
    roles: profile?.roles ?? [],
  };

  const rawItems = await listEditorialReviewItems();
  const decisions = await listEditorialDecisions(rawItems.map((i) => i.id));

  // Per-content authoritative signals come from the database functions, never
  // from the browser. A handful of items, so the per-item calls are fine.
  const items: BoardItem[] = await Promise.all(
    rawItems.map(async (item) => {
      const itemDecisions = decisions
        .filter((d) => d.contentId === item.id)
        .map<BoardDecision>((d) => ({
          id: d.id,
          contentVersionId: d.contentVersionId,
          reviewerId: d.reviewerId,
          decision: d.decision,
          rationale: d.rationale,
          evidenceRef: d.evidenceRef,
          publicationEligible: d.publicationEligible,
          decidedAt: d.decidedAt,
          onCurrentRevision: item.currentVersionId !== null && d.contentVersionId === item.currentVersionId,
        }));

      const approversOnCurrent = new Set(
        itemDecisions.filter((d) => d.decision === "approve" && d.onCurrentRevision).map((d) => d.reviewerId),
      );

      const [publicationEligible, ledgerValid] = await Promise.all([
        getEditorialPublicationEligible(item.id),
        getEditorialLedgerValid(item.id),
      ]);

      return {
        ...item,
        decisions: itemDecisions,
        publicationEligible,
        ledgerValid,
        requiredApprovers: item.isHighImpact ? 2 : 1,
        approversOnCurrent: approversOnCurrent.size,
        viewerApprovedCurrent: approversOnCurrent.has(reviewer.userId),
      };
    }),
  );

  return (
    <>
      <h1 className="font-display text-xl font-bold text-white">Editorial review — authenticated</h1>
      <p className="mt-1 text-sm text-silver">
        Real content and the real decision ledger from the database. Decisions are recorded under your authenticated
        identity; publication stays a separate, explicit step.
      </p>
      <div className="mt-6">
        <AuthenticatedEditorialWorkbench items={items} reviewer={reviewer} mode="live" />
      </div>
    </>
  );
}
