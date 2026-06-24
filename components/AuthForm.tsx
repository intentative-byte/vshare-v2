"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";

export function AuthForm() {
  const router = useRouter();

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Continue learning</h1>
        <p className="text-slate-600">Your feed and progress are stored on this device.</p>
      </div>

      <div className="mt-8 space-y-4">
        <Button type="button" onClick={() => router.push("/feed")} className="w-full py-3">
          Continue in demo mode
          <ArrowRight className="ml-2 size-4" />
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/onboarding")} className="w-full py-3">
          Choose interests
        </Button>
      </div>
    </div>
  );
}
