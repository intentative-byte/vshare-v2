"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") ?? "/feed", [searchParams]);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClientSupabaseClient();
    const authCall =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName
              }
            }
          });

    const { error } = await authCall;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace(mode === "sign-up" ? "/onboarding" : nextPath);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">VShare v2</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to keep topic memory, feed relevance, and viewed content in sync.
          </p>
        </div>

        {mode === "sign-up" ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Display name</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold">Email</span>
          <Input
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold">Password</span>
          <Input
            type="password"
            value={password}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={6}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {message ? <p className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-100">{message}</p> : null}

        <Button className="w-full" disabled={loading}>
          {loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Sign up"}
        </Button>

        <button
          type="button"
          className="w-full rounded-full px-3 py-2 text-sm font-semibold text-[var(--gold)] hover:bg-white/5"
          onClick={() => setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </Card>
  );
}
