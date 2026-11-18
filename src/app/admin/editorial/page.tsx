import { EditorialWorkbench } from "@/components/editorial/editorial-workbench";
import { ORIGINALS_EDITORIAL } from "@/components/editorial/editorial-data";

export const metadata = { title: "Editorial review" };

/**
 * The Editorial Review Workbench, inside the admin area.
 *
 * Reviewer-only: the admin layout denies anyone without a moderator/admin role
 * server-side (notFound). It reads prepared editorial data (not a parallel
 * publication system) and records decisions locally only — it never writes to
 * the database, never publishes, and never approves on its own.
 */
export default function EditorialReviewPage() {
  return (
    <>
      <h1 className="font-display text-xl font-bold text-white">Editorial review — Originals</h1>
      <p className="mt-1 text-sm text-silver">
        Inspect evidence, corrections, second-review requirements and publication blockers. Decisions are recorded
        locally only; publication happens through the existing moderation gates.
      </p>
      <div className="mt-6">
        <EditorialWorkbench cards={ORIGINALS_EDITORIAL} />
      </div>
    </>
  );
}
