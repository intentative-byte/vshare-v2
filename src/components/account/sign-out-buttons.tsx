"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/modules/profiles";

export function SignOutButtons() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function end(everywhere: boolean) {
    startTransition(async () => {
      await signOut({ everywhere });
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <Button variant="secondary" disabled={isPending} onClick={() => end(false)}>
        Sign out
      </Button>
      <Button variant="ghost" disabled={isPending} onClick={() => end(true)}>
        Sign out everywhere
      </Button>
    </div>
  );
}
