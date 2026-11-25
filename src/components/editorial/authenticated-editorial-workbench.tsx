"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { recordEditorialDecision } from "@/modules/content";
import {
  DECISION_GUIDANCE,
  DEFAULT_FILTERS,
  deriveReviewState,
  matchesFilters,
  reviewerExplanation,
  type Decision,
  type ReviewFilters,
  type ReviewStateKey,
  type ReviewTone,
} from "./review-state";

/**
 * The AUTHENTICATED editorial workbench.
 *
 * Writes real editorial decisions through the authenticated server action
 * (content.recordEditorialDecision → the append-only ledger). Identity and
 * timestamps come from the database, never from this page; final publication
 * eligibility is read from the server, never computed here; and nothing here
 * publishes. It renders only real persisted content and the real audit ledger —
 * no fixtures, no localStorage.
 */

export type BoardDecision = {
  id: string;
  contentVersionId: string;
  reviewerId: string;
  decision: Decision;
  rationale: string;
  evidenceRef: string | null;
  publicationEligible: boolean;
  decidedAt: string;
  onCurrentRevision: boolean;
};

export type BoardItem = {
  id: string;
  slug: string;
  status: string;
  isHighImpact: boolean;
  currentVersionId: string | null;
  topicName: string;
  sourceUrl: string;
  linkCheckedAt: string | null;
  version: {
    title: string;
    summary: string;
    takeaways: string[];
    nextStep: string;
    sourceName: string;
    sourceAuthor: string | null;
  } | null;
  decisions: BoardDecision[];
  publicationEligible: boolean;
  ledgerValid: boolean;
  requiredApprovers: number;
  approversOnCurrent: number;
  viewerApprovedCurrent: boolean;
};

export type Reviewer = { userId: string; displayName: string; roles: string[] };

const DECISION_OPTIONS = [
  { value: "approve", label: "Approve" },
  { value: "request_revision", label: "Request revision" },
  { value: "reject", label: "Reject" },
  { value: "escalate", label: "Escalate for independent review" },
];

const STATUS_OPTIONS: Array<{ value: ReviewStateKey | "all"; label: string }> = [
  { value: "all", label: "Any review status" },
  { value: "pending_review", label: "Pending review" },
  { value: "pending_second_review", label: "Pending second review" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "rejected", label: "Rejected" },
  { value: "approved_eligible", label: "Approved — eligible" },
  { value: "no_revision", label: "No revision" },
];

const toneClass: Record<ReviewTone, string> = {
  neutral: "#555",
  good: "#1a7f37",
  warn: "#9a6700",
  bad: "#b42318",
};

function shortId(id: string): string {
  return id.slice(0, 8);
}

function when(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC";
}

type ActionError = { code: string; message: string; fields?: Record<string, string>; retryAfterSeconds?: number };

/** Turn a result error (or a thrown network error) into reviewer-facing text. */
function describeError(err: ActionError): string {
  switch (err.code) {
    case "UNAUTHENTICATED":
      return "Your session has expired. Sign in again, then retry — nothing was recorded.";
    case "FORBIDDEN":
      return "You no longer have reviewer access, so nothing was recorded.";
    case "RATE_LIMITED":
      return `Too many attempts. Try again${err.retryAfterSeconds ? ` in ${err.retryAfterSeconds}s` : " shortly"}.`;
    case "CONFLICT":
      return err.message; // e.g. already approved this revision
    case "NOT_FOUND":
      return "That content or revision no longer exists. Refresh and try again — nothing was recorded.";
    case "VALIDATION":
      return err.fields?.rationale ?? err.message;
    default:
      return "Could not reach the server, so nothing was recorded. Check your connection and try again.";
  }
}

export function AuthenticatedEditorialWorkbench({
  items,
  reviewer,
  mode = "live",
}: {
  items: BoardItem[];
  reviewer: Reviewer;
  mode?: "live" | "preview";
}) {
  const [filters, setFilters] = useState<ReviewFilters>(DEFAULT_FILTERS);

  const topics = useMemo(
    () => Array.from(new Set(items.map((i) => i.topicName).filter(Boolean))).sort(),
    [items],
  );
  const visible = useMemo(() => items.filter((i) => matchesFilters(i, filters)), [items, filters]);

  return (
    <section aria-label="Authenticated editorial review">
      <div className="rounded-[var(--radius-control)] border border-border bg-raised p-3 text-sm text-silver">
        {mode === "preview" ? (
          <p>
            <strong className="text-white">Accessibility preview — not connected to the database.</strong> No decision is
            recorded here. The authoritative surface is <code className="text-white">/admin/editorial</code>, staff-only.
          </p>
        ) : (
          <p>
            <strong className="text-white">Authenticated — decisions are recorded in the database audit ledger.</strong>{" "}
            Your identity and the time are set by the server, not this page. Recording a decision never publishes;
            publication stays a separate, explicit step.
          </p>
        )}
        <p className="mt-2 text-xs text-silver">
          Signed in as <strong className="text-white">{reviewer.displayName}</strong> ·{" "}
          {reviewer.roles.join(", ") || "no role"} · id {shortId(reviewer.userId)}
        </p>
      </div>

      <FilterBar filters={filters} topics={topics} onChange={setFilters} count={visible.length} total={items.length} />

      {items.length === 0 ? (
        <p className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-silver">
          No content is currently awaiting review in this database. When draft Originals (or submissions) exist and
          carry an immutable revision, they appear here. Nothing is fabricated.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm text-silver">
          No items match the current filters.{" "}
          <button type="button" className="text-blue underline" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear filters
          </button>
          .
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {visible.map((item) => (
            <li key={item.id}>
              <ItemPanel item={item} reviewer={reviewer} mode={mode} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterBar({
  filters,
  topics,
  onChange,
  count,
  total,
}: {
  filters: ReviewFilters;
  topics: string[];
  onChange: (f: ReviewFilters) => void;
  count: number;
  total: number;
}) {
  return (
    <div className="mt-4 grid gap-3 rounded-[var(--radius-control)] border border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField
        id="filter-status"
        label="Review status"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as ReviewFilters["status"] })}
      />
      <SelectField
        id="filter-impact"
        label="Impact level"
        options={[
          { value: "all", label: "Any impact" },
          { value: "high", label: "High-impact only" },
          { value: "standard", label: "Standard only" },
        ]}
        value={filters.impact}
        onChange={(e) => onChange({ ...filters, impact: e.target.value as ReviewFilters["impact"] })}
      />
      <SelectField
        id="filter-topic"
        label="Category / topic"
        options={[{ value: "all", label: "Any topic" }, ...topics.map((t) => ({ value: t, label: t }))]}
        value={filters.topic}
        onChange={(e) => onChange({ ...filters, topic: e.target.value })}
      />
      <SelectField
        id="filter-eligibility"
        label="Reviewer eligibility"
        hint="‘Awaiting my review’ hides items you have already acted on or that are already decided."
        options={[
          { value: "all", label: "All items" },
          { value: "awaiting_me", label: "Awaiting my review" },
        ]}
        value={filters.eligibility}
        onChange={(e) => onChange({ ...filters, eligibility: e.target.value as ReviewFilters["eligibility"] })}
      />
      <p className="text-xs text-silver-dim sm:col-span-2 lg:col-span-4" aria-live="polite">
        Showing {count} of {total}.
      </p>
    </div>
  );
}

function Badge({ tone, children }: { tone: ReviewTone; children: React.ReactNode }) {
  return (
    <span
      style={{ background: toneClass[tone] }}
      className="mr-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
    >
      {children}
    </span>
  );
}

function ItemPanel({ item, reviewer, mode }: { item: BoardItem; reviewer: Reviewer; mode: "live" | "preview" }) {
  const state = deriveReviewState(item);
  const supersededApprovals = item.decisions.some((d) => d.decision === "approve" && !d.onCurrentRevision);

  return (
    <details className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <summary className="cursor-pointer">
        <span className="font-display text-base font-bold text-white">{item.version?.title ?? item.slug}</span>{" "}
        <Badge tone="neutral">{item.status}</Badge>
        {item.isHighImpact ? <Badge tone="bad">high-impact</Badge> : null}
        <Badge tone={state.tone}>{state.label}</Badge>
        {!item.ledgerValid ? <Badge tone="bad">ledger invalid</Badge> : null}
      </summary>

      <div className="mt-3 text-sm text-text">
        <p className="text-xs text-silver">
          <strong className="text-white">{item.topicName}</strong> · revision{" "}
          <code className="text-white">{item.currentVersionId ? shortId(item.currentVersionId) : "none"}</code> (the
          exact revision under review)
        </p>
        <p className="mt-1 text-xs text-silver">{state.explanation}</p>

        {item.version ? (
          <>
            <p className="mt-2">{item.version.summary}</p>
            <ul className="mt-1 list-disc pl-5 text-silver">
              {item.version.takeaways.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <p className="mt-1 text-silver-dim">Next step: {item.version.nextStep}</p>
          </>
        ) : (
          <p className="mt-2 text-danger">This content has no current revision; it cannot be reviewed.</p>
        )}

        <p className="mt-2 text-xs">
          <strong>Source:</strong>{" "}
          <a href={item.sourceUrl} rel="noopener noreferrer nofollow ugc" className="text-blue underline">
            {item.sourceUrl}
          </a>
        </p>
        <p className="mt-1 text-xs">
          <strong>Evidence verification:</strong>{" "}
          {item.linkCheckedAt ? (
            <span className="text-success">source link checked {when(item.linkCheckedAt)}</span>
          ) : (
            <span className="text-danger">
              not verified — a human must check the source before publication (this is a content card; any related
              multimedia metadata is not factual verification)
            </span>
          )}
        </p>

        <div className="mt-3 rounded-[var(--radius-control)] border border-border p-2 text-xs">
          <p className="text-white">
            Review status{" "}
            {item.isHighImpact ? (
              <>
                (high-impact — two distinct reviewers required): {item.approversOnCurrent}/{item.requiredApprovers}{" "}
                distinct approvals on this revision.
              </>
            ) : (
              <>
                (standard — one reviewer): {item.approversOnCurrent}/{item.requiredApprovers} approval on this revision.
              </>
            )}
          </p>
          <p className="mt-1 text-silver">
            Publication eligibility (server-computed):{" "}
            <strong className={item.publicationEligible ? "text-success" : "text-danger"}>
              {item.publicationEligible ? "quorum met" : "not met"}
            </strong>
            . Eligibility is never decided by this page, and does not publish anything.
          </p>
          {supersededApprovals ? (
            <p className="mt-1 text-danger">
              Earlier approvals were recorded on a previous revision and no longer establish eligibility — the content
              has since changed.
            </p>
          ) : null}
          {!item.ledgerValid ? (
            <p className="mt-1 text-danger">
              The decision hash chain for this content does not validate. Treat the audit history as compromised and
              investigate before acting.
            </p>
          ) : null}
        </div>

        <DecisionLedger decisions={item.decisions} reviewer={reviewer} currentVersionId={item.currentVersionId} />

        <DecisionForm item={item} mode={mode} />
      </div>
    </details>
  );
}

function DecisionLedger({
  decisions,
  reviewer,
  currentVersionId,
}: {
  decisions: BoardDecision[];
  reviewer: Reviewer;
  currentVersionId: string | null;
}) {
  if (decisions.length === 0) {
    return <p className="mt-3 text-xs text-silver-dim">No decisions recorded yet.</p>;
  }
  return (
    <div className="mt-3">
      <h3 className="text-sm font-bold text-white">Audit ledger (from the database)</h3>
      <ol className="mt-2 grid gap-2">
        {decisions.map((d) => {
          const onCurrent = currentVersionId !== null && d.contentVersionId === currentVersionId;
          return (
            <li key={d.id} className="rounded-[var(--radius-control)] border border-border p-2 text-xs">
              <p>
                <strong className="text-white">
                  reviewer <code>{shortId(d.reviewerId)}</code>
                  {d.reviewerId === reviewer.userId ? " (you)" : ""}
                </strong>{" "}
                {reviewerExplanation(d.decision, onCurrent)} · {when(d.decidedAt)}
              </p>
              <p className="text-silver">
                revision <code>{shortId(d.contentVersionId)}</code>{" "}
                {onCurrent ? (
                  <span className="text-success">(current)</span>
                ) : (
                  <span className="text-danger">(superseded)</span>
                )}
              </p>
              <p className="mt-1 text-silver">{d.rationale}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DecisionForm({ item, mode }: { item: BoardItem; mode: "live" | "preview" }) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>("request_revision");
  const [rationale, setRationale] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [done, setDone] = useState("");
  const [isPending, startTransition] = useTransition();

  const noRevision = item.currentVersionId === null;

  function submit() {
    setError("");
    setFieldError("");
    setDone("");
    if (mode === "preview") {
      setError("Preview only — this form does not record a decision here.");
      return;
    }
    if (item.currentVersionId === null) {
      setError("This content has no current revision to bind the decision to.");
      return;
    }
    const versionId = item.currentVersionId;
    startTransition(async () => {
      try {
        const result = await recordEditorialDecision({
          contentId: item.id,
          contentVersionId: versionId,
          decision,
          rationale: rationale.trim(),
          ...(evidenceRef.trim() ? { evidenceRef: evidenceRef.trim() } : {}),
        });
        if (!result.ok) {
          const message = describeError(result.error);
          if (result.error.code === "VALIDATION") {
            setFieldError(message);
          }
          setError(message);
          return;
        }
        setRationale("");
        setEvidenceRef("");
        setDone(
          result.data.publicationEligible
            ? "Decision recorded. The server reports this revision now meets the approval quorum (this does not publish it)."
            : "Decision recorded in the audit ledger.",
        );
        router.refresh();
      } catch {
        // A thrown error means the request never completed (e.g. the network
        // dropped). Nothing was recorded.
        setError("Could not reach the server, so nothing was recorded. Check your connection and try again.");
      }
    });
  }

  return (
    <form
      className="mt-4 border-t border-border pt-3"
      onSubmit={(e) => e.preventDefault()}
      aria-label={`Record a decision for ${item.version?.title ?? item.slug}`}
    >
      <h3 className="text-sm font-bold text-white">Record an authenticated decision</h3>
      <div className="mt-2 grid gap-3">
        <SelectField
          id={`decision-${item.id}`}
          label="Decision"
          hint={DECISION_GUIDANCE[decision]}
          options={DECISION_OPTIONS}
          value={decision}
          onChange={(e) => setDecision(e.target.value as Decision)}
        />
        <TextArea
          id={`rationale-${item.id}`}
          label="Rationale"
          hint="A clear rationale is required (at least 10 characters). Your identity and the time are set by the server."
          rows={3}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          error={fieldError || undefined}
        />
        <TextField
          id={`evidence-${item.id}`}
          label="Evidence reference (optional)"
          hint="A link or citation supporting this decision."
          value={evidenceRef}
          onChange={(e) => setEvidenceRef(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={isPending || noRevision} onClick={submit}>
            {isPending ? "Recording…" : "Record decision"}
          </Button>
        </div>
        <div role="alert" aria-live="assertive">
          {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
        </div>
        <div role="status" aria-live="polite">
          {done ? <p className="text-xs font-semibold text-success">{done}</p> : null}
        </div>
      </div>
    </form>
  );
}
