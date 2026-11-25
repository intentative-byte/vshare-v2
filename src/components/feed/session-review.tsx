"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recordSessionReview } from "@/modules/feed";

type Props = { sessionId: string };

const formats = ["article", "video", "podcast", "course", "tool", "book"] as const;

/**
 * The optional end-of-session review.
 *
 * It appears once, on the session-complete screen — never as more cards, so
 * it cannot become an endless stream. Every part is optional and it can be
 * dismissed; skipping it loses nothing, because progress was recorded while
 * the session ran. It feeds personalisation only, never publication.
 */
export function SessionReview({ sessionId }: Props) {
  const [done, setDone] = useState(false);
  const [useful, setUseful] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [format, setFormat] = useState<(typeof formats)[number] | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await recordSessionReview({
        sessionId,
        ...(useful !== null ? { useful } : {}),
        ...(rating !== null ? { rating } : {}),
        ...(format ? { preferredFormat: format } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="mt-6 border-t border-border pt-4 text-sm text-silver-dim">
        Thanks — this helps VAI learn what is useful to you. You can change or clear what it
        learns any time on the You tab.
      </p>
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="text-sm font-semibold text-text">A quick, optional review</p>
      <p className="mt-1 text-sm text-silver-dim">
        It helps VAI learn how you like to learn. You can skip it.
      </p>

      <div className="mt-4 grid gap-4">
        <div>
          <span className="text-sm text-silver">Was this session useful?</span>
          <div className="mt-2 flex gap-2">
            <Button
              variant={useful === true ? "primary" : "secondary"}
              onClick={() => setUseful(true)}
            >
              Yes
            </Button>
            <Button
              variant={useful === false ? "primary" : "secondary"}
              onClick={() => setUseful(false)}
            >
              Not really
            </Button>
          </div>
        </div>

        <div>
          <span className="text-sm text-silver">How would you rate it?</span>
          <div className="mt-2 flex gap-2" role="group" aria-label="Rating out of five">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rating === n}
                aria-label={`${n} out of 5`}
                onClick={() => setRating(n)}
                className={`min-h-11 min-w-11 rounded-[var(--radius-control)] border text-sm font-semibold ${
                  rating !== null && n <= rating
                    ? "border-gold bg-raised text-gold"
                    : "border-border text-silver hover:text-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm text-silver">Want more of a particular format?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {formats.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(format === f ? null : f)}
                className={`min-h-11 rounded-[var(--radius-control)] border px-3 text-sm font-semibold capitalize ${
                  format === f
                    ? "border-gold bg-raised text-white"
                    : "border-border text-silver hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-silver-dim">
            We will show a little more of this, never less of the rest.
          </p>
        </div>

        <label className="text-sm text-silver">
          Anything else? (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            className="mt-1 w-full rounded-[var(--radius-control)] border border-border-strong bg-raised px-3 py-2 text-text"
          />
        </label>

        <div className="flex gap-2">
          <Button disabled={isPending} onClick={submit}>
            Send review
          </Button>
          <Button variant="ghost" onClick={() => setDone(true)}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
