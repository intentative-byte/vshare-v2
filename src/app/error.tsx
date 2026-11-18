"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

/**
 * The last-resort boundary. It shows no internal detail: the cause is logged
 * on the server with a request id (docs/VSHARES_SECURITY.md T11).
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="content" className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-4 py-12">
      <ErrorState
        title="Something went wrong"
        body="This page did not load. Trying again often fixes it."
      >
        <Button onClick={reset}>Try again</Button>
      </ErrorState>
    </main>
  );
}
