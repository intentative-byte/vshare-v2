"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { getNextBest } from "@/modules/feed";
import { getProgressSummary } from "@/modules/progress";
import type { NextBestMove } from "@/modules/vai";

type Summary = {
  week: { completed: number; minutes: number };
  allTime: { completed: number; minutes: number; activeDays: number; topicsExplored: number; saved: number };
};

/**
 * One recommendation and this week's progress.
 *
 * The recommendation comes from the rule engine, and the reason shown is
 * the rule that fired. The numbers come from completion records only.
 */
export function PathView() {
  const [move, setMove] = useState<NextBestMove | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [moveResult, summaryResult] = await Promise.all([
        getNextBest({}),
        getProgressSummary({}),
      ]);

      if (cancelled) {
        return;
      }

      if (moveResult.ok) {
        setMove(moveResult.data as NextBestMove);
      } else {
        setFailed(true);
      }

      if (summaryResult.ok) {
        setSummary(summaryResult.data as Summary);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <ErrorState title="We could not work out your next step" />;
  }

  if (!move) {
    return (
      <LoadingRegion label="Working out your next step">
        <Skeleton className="h-40 w-full" />
      </LoadingRegion>
    );
  }

  return (
    <>
      <Card emphasis>
        <p className="text-sm font-semibold tracking-wide text-gold uppercase">Next best</p>
        <CardTitle className="mt-2">{move.action}</CardTitle>
        <CardBody className="mt-2">{move.reason}</CardBody>
        <div className="mt-5">
          <ButtonLink href={move.href}>Do this</ButtonLink>
        </div>
        <Disclosure label="How this was chosen">
          VSHARES works through a short list of rules in order: finish what you started, then open
          what you saved, then choose a topic if you have not, then the best match in your topics.
          The sentence above names the rule that applied. No model is involved.
        </Disclosure>
      </Card>

      <h2 className="mt-8 text-lg text-white">This week</h2>
      <dl className="tabular mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Completed", summary?.week.completed ?? 0, "Resources you marked as taken in."],
          ["Minutes", summary?.week.minutes ?? 0, "Added up from the length of what you completed."],
          ["Topics", summary?.allTime.topicsExplored ?? 0, "Topics you have completed something in."],
          ["Saved", summary?.allTime.saved ?? 0, "Resources in your library."],
        ].map(([label, value, definition]) => (
          <div
            key={label as string}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            <dt className="text-xs font-semibold tracking-wide text-silver-dim uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
            <dd className="mt-1 text-xs text-silver-dim">{definition}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm text-silver-dim">
        Opening something is not completing it, and time on a page is never counted.
      </p>
    </>
  );
}
