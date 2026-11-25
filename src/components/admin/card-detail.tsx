"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextArea } from "@/components/ui/text-area";
import { Disclosure } from "@/components/ui/disclosure";
import { addCardVersion, moderateCard, type CardDetail } from "@/modules/content";

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC" : "—";
}

export function CardDetailView({ card }: { card: CardDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <div className="grid gap-6">
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-silver-dim uppercase">
              <span className="text-gold">{card.status}</span>
              <span>{card.categoryName}</span>
              <span>{card.topicName}</span>
              <span>{card.level}</span>
              <span>{card.format}</span>
              <span>{card.estimatedMinutes} min</span>
              {card.isHighImpact ? <span className="text-gold">High impact</span> : null}
              {card.isAiAssisted ? <span className="text-blue">AI assisted</span> : null}
            </p>
            <h2 className="mt-2 font-display text-xl text-white">
              {card.currentVersion?.title ?? "(no version)"}
            </h2>
          </div>
          {card.status === "published" ? (
            <Link href={`/c/${card.slug}`} className="text-sm font-semibold text-blue">
              View public page
            </Link>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-silver-dim">Source</dt>
            <dd className="break-words text-silver">
              {card.sourceUrl}
            </dd>
          </div>
          <div>
            <dt className="text-silver-dim">Link check</dt>
            <dd className={card.linkCheckedAt ? "text-success" : "text-danger"}>
              {card.linkCheckedAt ? `Checked ${when(card.linkCheckedAt)}` : "Not checked"}
            </dd>
          </div>
          <div>
            <dt className="text-silver-dim">Quality score</dt>
            <dd className="text-silver">{card.qualityScore}</dd>
          </div>
          <div>
            <dt className="text-silver-dim">Published</dt>
            <dd className="text-silver">{when(card.publishedAt)}</dd>
          </div>
        </dl>

        {card.rejectionReason ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-danger/40 bg-danger/5 p-3 text-sm text-silver">
            Rejected: {card.rejectionReason}
          </p>
        ) : null}

        {card.linkCheckedAt === null ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-border bg-raised p-3 text-sm text-silver">
            This card cannot be published until its source link has been checked. Only the
            verifier can record that — it is not a button here, on purpose.
          </p>
        ) : null}
      </section>

      <ReviewPanel card={card} onChange={() => router.refresh()} />

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-white">Current version</h3>
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "New version"}
          </Button>
        </div>

        {editing ? (
          <VersionForm card={card} onDone={() => setEditing(false)} />
        ) : card.currentVersion ? (
          <div className="mt-3 grid gap-2 text-sm">
            <p className="text-silver">{card.currentVersion.summary}</p>
            <ul className="list-disc pl-5 text-silver">
              {card.currentVersion.takeaways.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="text-silver-dim">Next step: {card.currentVersion.nextStep}</p>
            <p className="text-xs text-silver-dim">
              {card.currentVersion.sourceName}
              {card.currentVersion.sourceAuthor ? ` · ${card.currentVersion.sourceAuthor}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-silver-dim">This card has no version yet.</p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h3 className="font-display text-lg text-white">Version history</h3>
        <Disclosure label={`${card.versions.length} version${card.versions.length === 1 ? "" : "s"}`}>
          <ol className="grid gap-3">
            {card.versions.map((version) => (
              <li key={version.versionNo} className="border-b border-border pb-3">
                <p className="text-sm font-semibold text-white">
                  v{version.versionNo} — {version.title}
                </p>
                <p className="mt-1 text-xs text-silver-dim">{when(version.createdAt)}</p>
                <p className="mt-1 text-sm text-silver">{version.summary}</p>
              </li>
            ))}
          </ol>
        </Disclosure>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <h3 className="font-display text-lg text-white">Moderation trail</h3>
        <ol className="mt-3 grid gap-2">
          {card.moderation.map((event, index) => (
            <li key={`${event.action}-${index}`} className="text-sm">
              <span className="font-semibold text-silver">{event.action}</span>
              <span className="ml-2 text-xs text-silver-dim">{when(event.createdAt)}</span>
              {event.reason ? <p className="text-silver">{event.reason}</p> : null}
            </li>
          ))}
          {card.moderation.length === 0 ? (
            <li className="text-sm text-silver-dim">Nothing recorded yet.</li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}

function ReviewPanel({ card, onChange }: { card: CardDetail; onChange: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function act(action: "approve" | "reject" | "archive" | "restore") {
    setError("");
    startTransition(async () => {
      const result = await moderateCard({
        contentId: card.id,
        action,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      if (!result.ok) {
        setError(result.error.fields?.reason ?? result.error.message);
        return;
      }
      setReason("");
      onChange();
    });
  }

  const canPublish = card.status === "draft" || card.status === "pending" || card.status === "rejected";

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h3 className="font-display text-lg text-white">Review</h3>
      <div className="mt-3 grid gap-3">
        <TextField
          id={`review-reason-${card.id}`}
          label="Reason"
          hint="Required to reject or archive. The submitter sees a rejection reason."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error || undefined}
        />
        <div className="flex flex-wrap gap-2">
          {canPublish ? (
            <>
              <Button disabled={isPending} onClick={() => act("approve")}>
                Approve and publish
              </Button>
              <Button variant="secondary" disabled={isPending} onClick={() => act("reject")}>
                Reject
              </Button>
            </>
          ) : null}
          {card.status === "published" ? (
            <Button variant="danger" disabled={isPending} onClick={() => act("archive")}>
              Archive
            </Button>
          ) : null}
          {card.status === "rejected" || card.status === "archived" ? (
            <Button variant="ghost" disabled={isPending} onClick={() => act("restore")}>
              Return to queue
            </Button>
          ) : null}
        </div>
        {card.isHighImpact ? (
          <p className="text-xs text-silver-dim">
            High impact: whoever approves this must not be the person who created it.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function VersionForm({ card, onDone }: { card: CardDetail; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const current = card.currentVersion;
  const [form, setForm] = useState({
    title: current?.title ?? "",
    summary: current?.summary ?? "",
    takeaways: (current?.takeaways ?? []).join("\n"),
    nextStep: current?.nextStep ?? "",
    sourceName: current?.sourceName ?? "",
    sourceAuthor: current?.sourceAuthor ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    setErrors({});
    const takeaways = form.takeaways
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await addCardVersion({
        contentId: card.id,
        title: form.title,
        summary: form.summary,
        takeaways,
        nextStep: form.nextStep,
        sourceName: form.sourceName,
        ...(form.sourceAuthor.trim() ? { sourceAuthor: form.sourceAuthor.trim() } : {}),
      });
      if (!result.ok) {
        setErrors(result.error.fields ?? { _: result.error.message });
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="mt-3 grid gap-3">
      <p className="text-sm text-silver-dim">
        A correction is a new version, never an edit of the old one. The history above keeps every
        version.
      </p>
      <TextField
        id={`v-title-${card.id}`}
        label="Title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        error={errors.title}
      />
      <TextArea
        id={`v-summary-${card.id}`}
        label="Summary"
        value={form.summary}
        onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
        error={errors.summary}
      />
      <TextArea
        id={`v-takeaways-${card.id}`}
        label="Takeaways"
        hint="One per line, up to three."
        value={form.takeaways}
        onChange={(e) => setForm((f) => ({ ...f, takeaways: e.target.value }))}
        error={errors.takeaways}
      />
      <TextField
        id={`v-next-${card.id}`}
        label="Next step"
        value={form.nextStep}
        onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))}
        error={errors.nextStep}
      />
      <TextField
        id={`v-source-${card.id}`}
        label="Publisher"
        value={form.sourceName}
        onChange={(e) => setForm((f) => ({ ...f, sourceName: e.target.value }))}
        error={errors.sourceName}
      />
      {errors._ ? <p className="text-sm font-semibold text-danger">{errors._}</p> : null}
      <div className="flex gap-2">
        <Button disabled={isPending} onClick={submit}>
          Save new version
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
