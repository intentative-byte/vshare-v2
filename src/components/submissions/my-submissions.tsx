"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { getMySubmissions, resubmitResource, type CardSummary } from "@/modules/content";

const statusLabels: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "text-silver-dim" },
  pending: { label: "With a moderator", tone: "text-blue" },
  published: { label: "Published", tone: "text-success" },
  rejected: { label: "Needs a correction", tone: "text-danger" },
  archived: { label: "Archived", tone: "text-silver-dim" },
};

/**
 * Someone's own submissions.
 *
 * The query runs as them and row-level security does the filtering, so this
 * cannot show anyone else's work even if the query were wrong.
 */
export function MySubmissions() {
  const [items, setItems] = useState<CardSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [correcting, setCorrecting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getMySubmissions({});

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setItems(result.data);
      } else {
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (failed) {
    return (
      <ErrorState title="These did not load" body="Trying again often fixes it.">
        <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
      </ErrorState>
    );
  }

  if (!items) {
    return (
      <LoadingRegion label="Loading your submissions">
        <Skeleton className="h-24 w-full" />
      </LoadingRegion>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="You have not submitted anything yet"
        body="If you know a resource that taught you something, recommend it."
        action={{ href: "/you/submit", label: "Submit a resource" }}
      />
    );
  }

  return (
    <ul className="grid gap-4">
      {items.map((item) => {
        const status = statusLabels[item.status] ?? { label: item.status, tone: "text-silver" };

        return (
          <li
            key={item.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-white">{item.title}</h2>
              <span className={`text-sm font-semibold ${status.tone}`}>{status.label}</span>
            </div>

            <p className="tabular mt-2 flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-silver-dim uppercase">
              <span>{item.topicName}</span>
              <span>Sent {new Date(item.createdAt).toLocaleDateString("en-GB")}</span>
            </p>

            {item.rejectionReason ? (
              <div className="mt-3 rounded-[var(--radius-control)] border border-danger/40 bg-danger/5 p-3">
                <p className="text-sm font-semibold text-white">What needs changing</p>
                <p className="mt-1 text-sm text-text">{item.rejectionReason}</p>
              </div>
            ) : null}

            {item.status === "published" ? (
              <p className="mt-3">
                <Link href={`/c/${item.slug}`} className="text-sm font-semibold text-blue underline">
                  See it live
                </Link>
              </p>
            ) : null}

            {item.status === "rejected" ? (
              correcting === item.id ? (
                <CorrectionForm
                  contentId={item.id}
                  onDone={() => {
                    setCorrecting(null);
                    setAttempt((value) => value + 1);
                  }}
                  onCancel={() => setCorrecting(null)}
                />
              ) : (
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setCorrecting(item.id)}>
                    Correct and resend
                  </Button>
                </div>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function CorrectionForm({
  contentId,
  onDone,
  onCancel,
}: {
  contentId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const result = await resubmitResource({
      contentId,
      title,
      summary,
      takeaways: [takeaway],
      nextStep,
      sourceName,
    });

    if (result.ok) {
      onDone();
    } else {
      setFieldErrors(result.error.fields ?? {});

      if (!result.error.fields) {
        setError(result.error.message);
      }
    }

    setBusy(false);
  }

  return (
    <form
      className="mt-4 grid gap-4 border-t border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <p className="text-sm text-silver">
        Make the change the moderator asked for. This becomes a new version; the original is kept.
      </p>

      <TextField
        id={`title-${contentId}`}
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
        required
      />
      <TextField
        id={`summary-${contentId}`}
        label="Why it is worth someone's time"
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        error={fieldErrors.summary}
        required
      />
      <TextField
        id={`takeaway-${contentId}`}
        label="One takeaway"
        value={takeaway}
        onChange={(event) => setTakeaway(event.target.value)}
        error={fieldErrors["takeaways.0"]}
        required
      />
      <TextField
        id={`next-${contentId}`}
        label="What to do with it"
        value={nextStep}
        onChange={(event) => setNextStep(event.target.value)}
        error={fieldErrors.nextStep}
        required
      />
      <TextField
        id={`source-${contentId}`}
        label="Who published it"
        value={sourceName}
        onChange={(event) => setSourceName(event.target.value)}
        error={fieldErrors.sourceName}
        required
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send the correction"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div role="alert">
        {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      </div>
    </form>
  );
}
