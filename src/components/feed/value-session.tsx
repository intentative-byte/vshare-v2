"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { HighImpactNotice } from "@/components/catalogue/high-impact-notice";
import { endFeedSession, recordImpressions, whyThis, type FeedSession } from "@/modules/feed";
import { SessionReview } from "./session-review";
import { setInteraction, type InteractionState } from "@/modules/progress";

/**
 * A value session: a fixed number of cards, then a stopping point.
 *
 * There is no refill and no infinite scroll. When the cards run out the
 * session ends with what was actually finished, and starting another is a
 * deliberate choice.
 */

type ValueSessionProps = {
  session: FeedSession;
  onRestart: () => void;
};

type Summary = { explored: number; completed: number; saved: number; minutes: number; topics: number };

const emptyState: InteractionState = {
  opened: false,
  completed: false,
  saved: false,
  liked: false,
  skipped: false,
  feedback: null,
  changed: false,
};

export function ValueSession({ session, onRestart }: ValueSessionProps) {
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Record<string, InteractionState>>({});
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  const card = session.cards[index];
  // Strict indexing: no card means the session is over, whether we ran off
  // the end or the list was empty.
  const isFinished = !card;

  // Impressions are recorded once for the whole session, when it is served.
  useEffect(() => {
    // No session id means a visitor with no account: there is nothing to
    // attribute an impression to, and nothing should be recorded about them.
    if (session.cards.length === 0 || !session.sessionId) {
      return;
    }

    void recordImpressions({
      sessionId: session.sessionId,
      contentIds: session.cards.map((item) => item.id),
    });
  }, [session]);

  // The summary is produced by the database from what was really completed.
  useEffect(() => {
    if (!isFinished || summary || !session.sessionId) {
      return;
    }

    void endFeedSession({ sessionId: session.sessionId }).then((result) => {
      if (result.ok) {
        setSummary(result.data as unknown as Summary);
      }
    });
  }, [isFinished, summary, session.sessionId]);

  const act = useCallback(
    async (kind: "open" | "complete" | "save" | "like" | "skip" | "useful" | "not_useful", value = true) => {
      if (!card) {
        return;
      }

      setBusy(true);

      const result = await setInteraction({ contentId: card.id, kind, value });

      if (result.ok) {
        setStates((current) => ({ ...current, [card.id]: result.data }));
      }

      setBusy(false);
    },
    [card],
  );

  function advance() {
    setReasons(null);
    setIndex((current) => current + 1);
  }

  if (session.cards.length === 0) {
    return (
      <Card>
        <CardTitle>Nothing new for you right now</CardTitle>
        <CardBody className="mt-2">
          You have worked through what we have in these topics. Choose another topic, or come back
          when the catalogue has grown.
        </CardBody>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/explore">Choose another topic</ButtonLink>
        </div>
      </Card>
    );
  }

  if (isFinished) {
    return (
      <Card emphasis>
        <p className="text-sm font-semibold tracking-wide text-gold uppercase">Session complete</p>
        <CardTitle className="mt-2">That is the session</CardTitle>

        <dl className="tabular mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Explored", summary?.explored ?? session.cards.length],
            ["Completed", summary?.completed ?? 0],
            ["Saved", summary?.saved ?? 0],
            ["Minutes", summary?.minutes ?? 0],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs font-semibold tracking-wide text-silver-dim uppercase">
                {label}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <CardBody className="mt-5">
          Completed counts what you marked as taken in, not what scrolled past. Stopping here is a
          perfectly good outcome.
        </CardBody>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={onRestart}>Start another session</Button>
          <ButtonLink href="/saved" variant="secondary">
            Go to your library
          </ButtonLink>
        </div>

        {session.sessionId ? <SessionReview sessionId={session.sessionId} /> : null}
      </Card>
    );
  }

  const state = states[card.id] ?? emptyState;

  return (
    <div>
      {/* Where you are in a session of known length. */}
      <div className="mb-4">
        <div className="tabular flex items-center justify-between text-sm font-semibold text-silver-dim">
          <span>
            Card {card.position} of {session.cards.length}
          </span>
          <span>{card.estimatedMinutes} min</span>
        </div>
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuenow={card.position}
          aria-valuemin={1}
          aria-valuemax={session.cards.length}
          aria-label="Session progress"
        >
          <div
            className="gradient-gold h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(card.position / session.cards.length) * 100}%` }}
          />
        </div>
      </div>

      <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <p className="tabular flex flex-wrap gap-x-3 text-xs font-semibold tracking-wide text-gold uppercase">
          <span>{card.topic.name}</span>
          <span className="text-silver-dim">{card.level}</span>
          {card.isDiscovery ? <span className="text-blue">Something new</span> : null}
        </p>

        <h2 className="mt-3 font-display text-2xl font-bold text-white">{card.title}</h2>
        <p className="mt-3 text-silver">{card.summary}</p>

        {card.isHighImpact ? <HighImpactNotice className="mt-4" /> : null}

        <ul className="mt-5 grid gap-3">
          {card.takeaways.map((takeaway, position) => (
            <li
              key={takeaway}
              className="flex gap-3 rounded-[var(--radius-control)] border border-border bg-raised p-3"
            >
              <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs font-bold text-gold">
                {position + 1}
              </span>
              <span className="text-sm text-text">{takeaway}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-[var(--radius-control)] border border-gold/30 bg-raised p-3 text-sm text-text">
          <strong className="font-semibold text-white">Next step.</strong> {card.nextStep}
        </p>

        <p className="mt-4 text-xs text-silver-dim">
          {card.source.author ? `${card.source.author}, ` : ""}
          {card.source.name}
          {card.isAiAssisted ? " · summary drafted with AI assistance, reviewed by a person" : ""}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href={card.source.url} size="md">
            Read the original
          </ButtonLink>
          <Button
            variant="secondary"
            disabled={busy || state.completed}
            onClick={() => act("complete")}
          >
            {state.completed ? "Got it ✓" : "Got it"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => act("save", !state.saved)}>
            {state.saved ? "Saved ✓" : "Save"}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => act("like", !state.liked)}>
            {state.liked ? "Liked ✓" : "Like"}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              await act("skip");
              advance();
            }}
          >
            Skip
          </Button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="min-h-11 text-sm font-semibold text-blue hover:text-white"
            onClick={async () => {
              if (reasons) {
                setReasons(null);
                return;
              }

              if (!session.sessionId) {
                setReasons([
                  "This is ranked on quality and recency. Choose some topics and it will be ranked for you.",
                ]);
                return;
              }

              const result = await whyThis({
                sessionId: session.sessionId,
                contentId: card.id,
                topicName: card.topic.name,
              });

              setReasons(result.ok ? result.data.reasons : ["We could not load the reasons."]);
            }}
            aria-expanded={reasons !== null}
          >
            Why this?
          </button>

          {reasons ? (
            <ul className="mt-2 grid gap-1 text-sm text-silver">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>

      <div className="mt-5 flex items-center justify-between">
        <Link href="/explore" className="text-sm font-semibold text-silver-dim hover:text-white">
          Change topic
        </Link>
        <Button onClick={advance} disabled={busy}>
          {card.position === session.cards.length ? "Finish session" : "Next"}
        </Button>
      </div>
    </div>
  );
}
