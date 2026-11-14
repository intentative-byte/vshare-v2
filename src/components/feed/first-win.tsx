"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { HighImpactNotice } from "@/components/catalogue/high-impact-notice";
import { track, reportFirstWinSeconds } from "@/modules/analytics";
import { setInteraction } from "@/modules/progress";
import type { Card as ValueCard } from "@/modules/content";

/**
 * One card, read without an account, and a win at the end of it.
 *
 * Nothing about the reader is stored while they read. Pressing "Got it" is
 * the first thing that has to persist, so that is where an account appears.
 * The summary afterwards states what they did, and the offer to keep it
 * does not block anything.
 */
export function FirstWin({
  card,
  topicName,
  topicId,
}: {
  card: ValueCard | null;
  topicName: string;
  topicId: string;
}) {
  const [completed, setCompleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // Set in an effect rather than during render: the clock is impure, and a
  // re-render must not restart the timer.
  const arrivedAt = useRef<number | null>(null);

  useEffect(() => {
    arrivedAt.current ??= Date.now();

    void track({ name: "topic_selected", dimension: "topic", dimensionKey: topicName });

    if (card) {
      void track({ name: "first_card_shown", dimension: "topic", dimensionKey: topicName });
    }
  }, [card, topicName, topicId]);

  if (!card) {
    return (
      <EmptyState
        title={`Nothing published in ${topicName} yet`}
        body="Resources appear here once they have been written up, checked and reviewed. Try another topic in the meantime."
        action={{ href: "/explore", label: "Browse other topics" }}
      />
    );
  }

  async function complete() {
    if (!card) {
      return;
    }

    setBusy(true);

    // This is the first action that has to survive, so it is where a guest
    // account is created. Reading up to this point left no trace.
    const result = await setInteraction({ contentId: card.id, kind: "complete" });

    if (result.ok) {
      setCompleted(true);

      const startedAt = arrivedAt.current ?? Date.now();
      const seconds = Math.round((Date.now() - startedAt) / 1000);

      void track({
        name: "card_completed",
        dimension: "topic",
        dimensionKey: topicName,
        contentId: card.id,
      });
      // Reported through its own action, not as an event: the database
      // writes it once against the account, so a reload cannot report a
      // second, faster first win.
      void reportFirstWinSeconds({ seconds: Math.min(seconds, 86_400) });
    }

    setBusy(false);
  }

  async function save() {
    if (!card) {
      return;
    }

    setBusy(true);
    const result = await setInteraction({ contentId: card.id, kind: "save", value: !saved });

    if (result.ok) {
      setSaved(result.data.saved);
      void track({ name: "card_saved", dimension: "topic", dimensionKey: topicName });
    }

    setBusy(false);
  }

  if (completed) {
    return (
      <Card emphasis>
        <p className="text-sm font-semibold tracking-wide text-gold uppercase">Your first win</p>
        <CardTitle className="mt-2">You now know something you did not ten minutes ago</CardTitle>

        <CardBody className="mt-3">
          You finished <strong className="text-white">{card.title}</strong>. That counts as one
          completed resource and {card.estimatedMinutes} minutes of learning — the only things
          VSHARES counts.
        </CardBody>

        <div className="mt-5 rounded-[var(--radius-control)] border border-gold/30 bg-raised p-4">
          <p className="text-sm font-semibold text-white">Your next step</p>
          <p className="mt-1 text-sm text-text">{card.nextStep}</p>
        </div>

        <CardBody className="mt-5">
          Your progress is saved on this device. Add an email address and it follows you anywhere —
          nothing is moved or copied, so nothing can be lost.
        </CardBody>

        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/sign-in?next=%2Flearn">Keep my progress</ButtonLink>
          <ButtonLink href="/learn" variant="secondary">
            Keep learning
          </ButtonLink>
          {!saved ? (
            <Button variant="ghost" disabled={busy} onClick={() => void save()}>
              Save this for later
            </Button>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-silver-dim">
          You can carry on without an account. Nothing here is locked.
        </p>
      </Card>
    );
  }

  return (
    <article>
      <p className="tabular flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-gold uppercase">
        <span>{card.topic.name}</span>
        <span className="text-silver-dim">{card.level}</span>
        <span className="text-silver-dim">{card.estimatedMinutes} min</span>
      </p>

      <h2 className="mt-3 font-display text-3xl font-bold text-white">{card.title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-silver">{card.summary}</p>

      {card.isHighImpact ? <HighImpactNotice className="mt-5" /> : null}

      <h3 className="mt-8 text-lg text-white">What you take away</h3>
      <ul className="mt-3 grid gap-3">
        {card.takeaways.map((takeaway, position) => (
          <li
            key={takeaway}
            className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-sm font-bold text-gold">
              {position + 1}
            </span>
            <span className="text-text">{takeaway}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-[var(--radius-card)] border border-gold/30 bg-raised p-5">
        <h3 className="text-lg text-white">Your next step</h3>
        <p className="mt-2 text-text">{card.nextStep}</p>
      </div>

      <p className="mt-6 text-sm text-silver-dim">
        {card.source.author ? `${card.source.author}, ` : ""}
        {card.source.name}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button size="lg" disabled={busy} onClick={() => void complete()}>
          Got it
        </Button>
        <ButtonLink href={card.source.url} variant="secondary" size="lg">
          Read the original
        </ButtonLink>
      </div>

      <p className="mt-4 text-xs text-silver-dim">
        No account needed. <Link href="/explore" className="underline">Choose a different topic</Link>.
      </p>
    </article>
  );
}
