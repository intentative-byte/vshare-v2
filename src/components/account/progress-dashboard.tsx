"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { LoadingRegion, Skeleton } from "@/components/ui/states";
import { getProgressSummary } from "@/modules/progress";

type Summary = {
  week: { completed: number; minutes: number };
  allTime: {
    completed: number;
    minutes: number;
    activeDays: number;
    topicsExplored: number;
    saved: number;
  };
};

/**
 * Progress, and what each number means.
 *
 * Everything here is counted from completion records. There is no mastery
 * score, no intelligence rating and no improvement percentage, because
 * nothing we hold would support one.
 */
export function ProgressDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getProgressSummary({});

      if (!cancelled && result.ok) {
        setSummary(result.data as Summary);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary) {
    return (
      <LoadingRegion label="Loading your progress">
        <Skeleton className="h-32 w-full" />
      </LoadingRegion>
    );
  }

  const metrics: Array<[string, number, string]> = [
    [
      "Resources completed",
      summary.allTime.completed,
      "Things you marked as taken in. Opening something does not count.",
    ],
    [
      "Learning minutes",
      summary.allTime.minutes,
      "The estimated length of each resource you completed, added up. Not time spent on the page.",
    ],
    [
      "Topics explored",
      summary.allTime.topicsExplored,
      "Topics you have completed at least one resource in.",
    ],
    ["Saved resources", summary.allTime.saved, "What is in your library right now."],
    [
      "Active days",
      summary.allTime.activeDays,
      "Separate days on which you completed something.",
    ],
    [
      "Completed this week",
      summary.week.completed,
      "Resources completed in the last seven days.",
    ],
  ];

  return (
    <Card className="mb-6">
      <CardTitle>Your progress</CardTitle>
      <CardBody className="mt-2">
        Counted from what you finished, not from what you looked at.
      </CardBody>

      <dl className="tabular mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {metrics.map(([label, value, definition]) => (
          <div key={label}>
            <dt className="text-xs font-semibold tracking-wide text-silver-dim uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
            <dd className="mt-1 text-xs text-silver-dim">{definition}</dd>
          </div>
        ))}
      </dl>

      <Disclosure label="What is deliberately not here">
        There is no mastery score, no intelligence rating and no percentage saying how much you
        have improved. VSHARES has no way to measure those things honestly yet, so it does not
        claim to. When quizzes exist, demonstrated understanding will be counted separately from
        activity — and anything you tell us about applying something will be labelled as your own
        account of it.
      </Disclosure>
    </Card>
  );
}
