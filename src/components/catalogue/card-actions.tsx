"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { reportCard } from "@/modules/content";

const reasons = [
  { value: "broken_link", label: "The link does not work" },
  { value: "inaccurate", label: "Something here is wrong" },
  { value: "harmful", label: "This could harm someone" },
  { value: "spam", label: "This is marketing, not teaching" },
  { value: "copyright", label: "This copies someone's work" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Sharing and reporting on a public card.
 *
 * Sharing uses the canonical public address, so only published content can
 * ever be shared: an unpublished card has no page to link to. The native
 * share sheet is used where the browser offers one, with copying the link
 * as the fallback.
 */
export function CardActions({ contentId, slug, title }: { contentId: string; slug: string; title: string }) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>("broken_link");
  const [note, setNote] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sent" | "duplicate" | "failed">("idle");
  const [busy, setBusy] = useState(false);

  async function share() {
    const url = `${window.location.origin}/c/${slug}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        setShareState("idle");
        return;
      } catch {
        // The person dismissed the sheet, or the browser refused. Fall
        // through to copying, which always works.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
  }

  async function send() {
    setBusy(true);

    const result = await reportCard({
      contentId,
      reason: reason as "broken_link",
      ...(note.trim() ? { note: note.trim() } : {}),
    });

    if (result.ok) {
      setReportState("sent");
      setReporting(false);
    } else {
      setReportState(result.error.code === "CONFLICT" ? "duplicate" : "failed");
    }

    setBusy(false);
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => void share()}>
          Share
        </Button>
        <Button variant="ghost" onClick={() => setReporting((value) => !value)}>
          Report a problem
        </Button>
      </div>

      <div role="status" aria-live="polite">
        {shareState === "copied" ? (
          <p className="mt-3 text-sm font-semibold text-success">Link copied.</p>
        ) : null}
        {shareState === "failed" ? (
          <p className="mt-3 text-sm text-silver">
            Copy the address from your browser to share this.
          </p>
        ) : null}
        {reportState === "sent" ? (
          <p className="mt-3 text-sm font-semibold text-success">
            Thank you. A moderator will look at this.
          </p>
        ) : null}
        {reportState === "duplicate" ? (
          <p className="mt-3 text-sm text-silver">
            You have already reported this. A moderator still has it open.
          </p>
        ) : null}
      </div>

      {reporting ? (
        <form
          className="mt-4 grid gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-text">What is wrong with it?</legend>
            {reasons.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-sm text-text">
                <input
                  type="radio"
                  name="report-reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={(event) => setReason(event.target.value)}
                  className="size-4 accent-[var(--color-gold)]"
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <TextField
            id="report-note"
            label="Anything else (optional)"
            hint="A sentence helps a moderator check it quickly."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send the report"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReporting(false)}>
              Cancel
            </Button>
          </div>

          <div role="alert">
            {reportState === "failed" ? (
              <p className="text-sm font-semibold text-danger">
                That did not send. You may need an account to report something.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
