"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfigurationError } from "@/lib/supabase/env";

export function AuthForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);
  const supabaseConfigurationError = useMemo(() => getSupabaseConfigurationError(), []);
  const nextPath = searchParams.get("next") ?? "/feed";

  function handleMagicLink() {
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError(
        supabaseConfigurationError ?? "Supabase is not configured yet. Add the environment variables from .env.example.",
      );
      return;
    }

    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setMessage("Check your inbox for a secure sign-in link.");
    });
  }

  function handleGithub() {
    setError(null);

    if (!supabase) {
      setError(
        supabaseConfigurationError ?? "Supabase is not configured yet. Add the environment variables from .env.example.",
      );
      return;
    }

    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (signInError) {
        setError(signInError.message);
      }
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-soft">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
        <p className="text-slate-600">Sign in to personalize your VShare learning feed.</p>
      </div>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </label>
        <Button type="button" onClick={handleMagicLink} disabled={!email || isPending} className="w-full">
          <Mail className="mr-2 size-4" />
          Send magic link
        </Button>
        <Button type="button" variant="secondary" onClick={handleGithub} disabled={isPending} className="w-full">
          <span className="mr-2 text-xs font-black">GH</span>
          Continue with GitHub
        </Button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
