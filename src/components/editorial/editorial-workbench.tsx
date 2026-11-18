"use client";

import { useState } from "react";
import {
  evidenceQuality,
  requiresSecondReview,
  validateDecision,
  type DecisionAction,
  type EditorialCard,
} from "./editorial-data";

/**
 * The Editorial Review Workbench.
 *
 * A reviewer-only inspection surface for the ten Originals: statuses, claim-level
 * evidence, source limitations, outstanding revisions, high-impact second-review
 * requirements, related multimedia and publication blockers.
 *
 * The decision workflow here is a SIMULATION. It saves to the browser
 * (localStorage) only — it is not authenticated, not persisted to the server,
 * and is NOT an authoritative editorial decision. A typed reviewer name is not
 * an identity. The authoritative path is the authenticated server action
 * `content.recordEditorialDecision`, which writes the append-only, hash-chained
 * ledger with the signed-in reviewer's identity and a server timestamp — that
 * path is built and database-tested but NOT yet activated in this UI. The
 * agent's statuses are readiness assessments, not approvals, and the agent
 * cannot be the reviewer.
 */

const STORAGE_KEY = "vshares-editorial-decisions";

type SavedDecision = { action: DecisionAction; reviewer: string; rationale: string; at: string };

function loadDecisions(): Record<string, SavedDecision> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedDecision>) : {};
  } catch {
    return {};
  }
}

const statusColor: Record<EditorialCard["status"], string> = {
  "READY FOR HUMAN REVIEW": "#1a7f37",
  "REVISION REQUIRED": "#9a6700",
  "EVIDENCE BLOCKED": "#b42318",
};
const qualityColor = { strong: "#1a7f37", moderate: "#9a6700", limited: "#b42318" };

export function EditorialWorkbench({ cards }: { cards: EditorialCard[] }) {
  const [decisions, setDecisions] = useState<Record<string, SavedDecision>>(() =>
    typeof window === "undefined" ? {} : loadDecisions(),
  );

  function record(cardId: string, d: SavedDecision) {
    const next = { ...decisions, [cardId]: d };
    setDecisions(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* local-only; ignore if storage is unavailable */
    }
  }

  const counts = {
    ready: cards.filter((c) => c.status === "READY FOR HUMAN REVIEW").length,
    revision: cards.filter((c) => c.status === "REVISION REQUIRED").length,
    blocked: cards.filter((c) => c.status === "EVIDENCE BLOCKED").length,
    highImpact: cards.filter((c) => c.highImpact).length,
  };

  return (
    <section aria-label="Editorial review workbench">
      <p className="rounded-[var(--radius-control)] border border-border bg-raised p-3 text-sm text-silver">
        <strong className="text-white">Simulation — decisions here are not authenticated and not saved to the server.</strong>{" "}
        They are kept in this browser only (localStorage) and are <strong>not authoritative</strong>: a typed reviewer name is
        not a verified identity. The authoritative path is the authenticated server action{" "}
        <code className="text-white">content.recordEditorialDecision</code> (append-only, hash-chained ledger, signed-in
        reviewer, server timestamp) — built and database-tested, but <strong>not yet activated here</strong>. Nothing on this
        page publishes. The statuses are the assistant&rsquo;s readiness assessment, <strong>not approvals</strong>; a human
        reviewer decides, and the generating agent cannot be that reviewer.
      </p>

      <h2 className="mt-6 text-lg text-white">Overview</h2>
      <p className="text-sm text-silver">
        {cards.length} Originals · {counts.ready} ready for human review · {counts.revision} revision required ·{" "}
        {counts.blocked} evidence blocked · {counts.highImpact} high-impact (independent second review).
      </p>
      <p className="mt-1 text-xs text-silver">
        Content states: <Badge color="#555">draft</Badge> <Badge color="#3b5bdb">reviewed</Badge>{" "}
        <Badge color="#1a7f37">approved</Badge> <Badge color="#0b7285">published</Badge> — all ten are currently{" "}
        <strong className="text-white">draft</strong>.
      </p>

      <ul className="mt-4 grid gap-3">
        {cards.map((card) => (
          <li key={card.id}>
            <CardPanel card={card} saved={decisions[card.id]} onRecord={(d) => record(card.id, d)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: color }} className="mr-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
      {children}
    </span>
  );
}

function CardPanel({
  card,
  saved,
  onRecord,
}: {
  card: EditorialCard;
  saved?: SavedDecision;
  onRecord: (d: SavedDecision) => void;
}) {
  const quality = evidenceQuality(card);
  return (
    <details className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <summary className="cursor-pointer">
        <span className="font-display text-base font-bold text-white">{card.title}</span>{" "}
        <Badge color={statusColor[card.status]}>{card.status}</Badge>
        <Badge color="#555">{card.contentState}</Badge>
        {card.highImpact ? <Badge color="#b42318">high-impact</Badge> : null}
        <Badge color={qualityColor[quality]}>evidence: {quality}</Badge>
        {card.publicationBlockers.length ? (
          <span className="text-xs text-silver">· {card.publicationBlockers.length} blocker(s)</span>
        ) : null}
      </summary>

      <div className="mt-3 text-sm text-text">
        <p className="text-silver">
          <strong className="text-white">{card.category}</strong> · {card.level}
        </p>
        <p className="mt-2 italic text-silver">&ldquo;{card.hook}&rdquo;</p>
        <p className="mt-1">
          <strong>Objective:</strong> {card.objective}
        </p>
        <p className="mt-1">{card.explanation}</p>
        <p className="mt-2 text-xs">
          <strong>Source:</strong>{" "}
          <a href={card.sourceUrl} rel="noopener" className="text-blue underline">
            {card.sourceUrl}
          </a>
        </p>
        {card.sourceLimitation ? (
          <p className="mt-1 text-xs text-danger">Retrieval limitation: {card.sourceLimitation}</p>
        ) : null}

        <h3 className="mt-4 text-sm font-bold text-white">Claims &amp; evidence</h3>
        <ul className="mt-2 grid gap-2">
          {card.claims.map((c, i) => (
            <li key={i} className="rounded-[var(--radius-control)] border border-border p-2">
              <p className="font-semibold text-white">{c.claim}</p>
              <p className="text-xs text-silver">
                {c.authority} ({c.source}) · support: <strong>{c.directSupport}</strong> · confidence: {c.confidence} ·
                checked {c.verificationDate}
              </p>
              <p className="text-xs text-silver">Method: {c.method}</p>
              {c.contradictory ? (
                <p className="text-xs text-danger">Contradictory/qualifying: {c.contradictory}</p>
              ) : null}
              {c.concerns ? <p className="text-xs text-danger">Concern: {c.concerns}</p> : null}
            </li>
          ))}
        </ul>

        {card.media ? (
          <>
            <h3 className="mt-4 text-sm font-bold text-white">Related multimedia</h3>
            <p className="text-xs text-silver">
              {card.media.title} — {card.media.creator} · embed: {card.media.embedStatus} ·{" "}
              <strong className="text-danger">{card.media.factualReview}</strong>
            </p>
          </>
        ) : null}

        {card.outstandingConcerns.length ? (
          <>
            <h3 className="mt-4 text-sm font-bold text-white">Outstanding concerns</h3>
            <ul className="list-disc pl-5 text-xs text-silver">
              {card.outstandingConcerns.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </>
        ) : null}

        <h3 className="mt-4 text-sm font-bold text-white">Publication blockers</h3>
        <ul className="list-disc pl-5 text-xs text-silver">
          {card.publicationBlockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>

        <DecisionForm card={card} saved={saved} onRecord={onRecord} />
      </div>
    </details>
  );
}

function DecisionForm({
  card,
  saved,
  onRecord,
}: {
  card: EditorialCard;
  saved?: SavedDecision;
  onRecord: (d: SavedDecision) => void;
}) {
  const [reviewer, setReviewer] = useState("");
  const [rationale, setRationale] = useState("");
  const [secondReviewDone, setSecondReviewDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function submit(action: DecisionAction) {
    const result = validateDecision({ action, reviewerName: reviewer, rationale, secondReviewDone, card });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onRecord({ action, reviewer: reviewer.trim(), rationale: rationale.trim(), at: new Date().toISOString() });
  }

  const id = card.id;
  return (
    <form
      className="mt-4 border-t border-border pt-3"
      onSubmit={(e) => e.preventDefault()}
      aria-label={`Decision for ${card.title}`}
    >
      <h3 className="text-sm font-bold text-white">Human decision (simulated)</h3>
      <p className="mt-1 text-xs text-silver">
        For practice and review only. When the authenticated path is activated, the reviewer identity comes from the
        signed-in account — not from this field.
      </p>
      <div className="mt-2 grid gap-2">
        <label htmlFor={`reviewer-${id}`} className="text-xs text-silver">
          Reviewer name (simulation input — the generating agent cannot be the reviewer)
        </label>
        <input
          id={`reviewer-${id}`}
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          className="rounded-[var(--radius-control)] border border-border bg-raised px-2 py-1 text-sm text-white"
        />
        <label htmlFor={`rationale-${id}`} className="text-xs text-silver">
          Rationale (required)
        </label>
        <textarea
          id={`rationale-${id}`}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
          className="rounded-[var(--radius-control)] border border-border bg-raised px-2 py-1 text-sm text-white"
        />
        {requiresSecondReview(card) ? (
          <label className="flex items-center gap-2 text-xs text-danger">
            <input type="checkbox" checked={secondReviewDone} onChange={(e) => setSecondReviewDone(e.target.checked)} />
            An independent second review has been completed (required for high-impact approval)
          </label>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => submit("approve")} className="rounded-[var(--radius-control)] border border-border bg-raised px-3 py-1 text-sm font-semibold text-white">
          Approve
        </button>
        <button type="button" onClick={() => submit("request_revision")} className="rounded-[var(--radius-control)] border border-border bg-raised px-3 py-1 text-sm font-semibold text-white">
          Request revision
        </button>
        <button type="button" onClick={() => submit("reject")} className="rounded-[var(--radius-control)] border border-border bg-raised px-3 py-1 text-sm font-semibold text-white">
          Reject
        </button>
        {requiresSecondReview(card) ? (
          <button type="button" onClick={() => submit("escalate")} className="rounded-[var(--radius-control)] border border-border bg-raised px-3 py-1 text-sm font-semibold text-white">
            Escalate for second review
          </button>
        ) : null}
      </div>

      <div role="alert" className="mt-2">
        {errors.map((e, i) => (
          <p key={i} className="text-xs font-semibold text-danger">
            {e}
          </p>
        ))}
      </div>
      <div role="status" className="mt-2">
        {saved ? (
          <p className="text-xs text-success">
            Simulated (saved in this browser only): <strong>{saved.action}</strong> by {saved.reviewer} at{" "}
            {new Date(saved.at).toLocaleString("en-GB")}. Not authenticated, not persisted to the server, not published.
          </p>
        ) : null}
      </div>
    </form>
  );
}
