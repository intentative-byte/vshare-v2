"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { moderateCard, type CardSummary } from "@/modules/content";

type ModerationQueueProps = {
  cards: CardSummary[];
  status: string;
};

export function ModerationQueue({ cards, status }: ModerationQueueProps) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function act(contentId: string, action: "approve" | "reject" | "archive" | "restore") {
    setErrors((current) => ({ ...current, [contentId]: "" }));

    startTransition(async () => {
      const reason = reasons[contentId]?.trim();
      const result = await moderateCard({
        contentId,
        action,
        ...(reason ? { reason } : {}),
      });

      if (!result.ok) {
        setErrors((current) => ({
          ...current,
          [contentId]: result.error.fields?.reason ?? result.error.message,
        }));
        return;
      }

      router.refresh();
    });
  }

  return (
    <ul className="grid gap-4">
      {cards.map((card) => (
        <li
          key={card.id}
          className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-white">{card.title}</h2>
              <p className="tabular mt-2 flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-silver-dim uppercase">
                <span>{card.topicName}</span>
                <span>{card.level}</span>
                <span>{card.estimatedMinutes} min</span>
                {card.isHighImpact ? <span className="text-gold">High impact</span> : null}
                {card.isAiAssisted ? <span className="text-blue">AI assisted</span> : null}
                <span className={card.linkCheckedAt ? "text-success" : "text-danger"}>
                  {card.linkCheckedAt ? "Link checked" : "Link unchecked"}
                </span>
              </p>
              {card.rejectionReason ? (
                <p className="mt-2 text-sm text-silver">Rejected: {card.rejectionReason}</p>
              ) : null}
            </div>
            {card.status === "published" ? (
              <Link href={`/c/${card.slug}`} className="text-sm font-semibold text-blue">
                View
              </Link>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <TextField
              id={`reason-${card.id}`}
              label="Reason"
              hint="Required to reject or archive. The submitter sees it."
              value={reasons[card.id] ?? ""}
              onChange={(event) =>
                setReasons((current) => ({ ...current, [card.id]: event.target.value }))
              }
              error={errors[card.id] || undefined}
            />

            <div className="flex flex-wrap gap-2">
              {status === "published" ? (
                <Button variant="danger" disabled={isPending} onClick={() => act(card.id, "archive")}>
                  Archive
                </Button>
              ) : (
                <>
                  <Button disabled={isPending} onClick={() => act(card.id, "approve")}>
                    Approve and publish
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => act(card.id, "reject")}
                  >
                    Reject
                  </Button>
                </>
              )}
              {status === "rejected" ? (
                <Button variant="ghost" disabled={isPending} onClick={() => act(card.id, "restore")}>
                  Return to queue
                </Button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
