"use client";

import { useEffect, useState } from "react";
import { ValueSession } from "./value-session";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { getFeedSession, type FeedSession } from "@/modules/feed";

type Status = "loading" | "ready" | "failed";

/**
 * Fetches a session and hands it to the session view.
 *
 * Loading, empty, error and finished are all real states with their own
 * treatment: nothing here quietly shows something other than what was asked
 * for. A request in flight is abandoned if the topic changes or another
 * session is requested, so a stale answer cannot overwrite a newer one.
 */
export function FeedClient({ topicSlug }: { topicSlug: string | null }) {
  const [session, setSession] = useState<FeedSession | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getFeedSession({ topicId: null });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setSession(result.data);
        setStatus("ready");
      } else {
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [topicSlug, attempt]);

  function reload() {
    setStatus("loading");
    setSession(null);
    setAttempt((current) => current + 1);
  }

  if (status === "loading") {
    return (
      <LoadingRegion label="Building your session">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </LoadingRegion>
    );
  }

  if (status === "failed" || !session) {
    return (
      <ErrorState
        title="We could not build a session"
        body="Something went wrong at our end. Trying again often fixes it."
      >
        <Button onClick={reload}>Try again</Button>
      </ErrorState>
    );
  }

  return <ValueSession session={session} onRestart={reload} />;
}
