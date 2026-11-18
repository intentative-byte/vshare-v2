"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { requestMagicLink, upgradeGuest } from "@/modules/profiles";

type SignInFormProps = {
  next: string;
  /** A guest is adding an address to the account they are already using. */
  isGuest: boolean;
  initialError?: string;
};

const errorMessages: Record<string, string> = {
  callback: "That link did not work. It may have expired. Please request a new one.",
};

export function SignInForm({ next, isGuest, initialError }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? (errorMessages[initialError] ?? null) : null,
  );
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    setError(null);
    setFieldError(undefined);

    startTransition(async () => {
      const result = isGuest
        ? await upgradeGuest({ email })
        : await requestMagicLink({ email, next });

      if (!result.ok) {
        setFieldError(result.error.fields?.email);

        if (!result.error.fields?.email) {
          setError(result.error.message);
        }

        return;
      }

      // The same wording either way: this page never reveals whether an
      // address already has an account.
      setMessage(`Check ${email} for a link to continue. It expires shortly.`);
    });
  }

  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        id="email"
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError}
      />

      <Button type="submit" size="lg" className="mt-4 w-full" disabled={isPending || email === ""}>
        {isPending ? "Sending…" : isGuest ? "Keep my progress" : "Email me a link"}
      </Button>

      <div role="status" aria-live="polite">
        {message ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-success/40 bg-success/5 p-3 text-sm text-text">
            {message}
          </p>
        ) : null}
      </div>

      <div role="alert">
        {error ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-danger/40 bg-danger/5 p-3 text-sm text-text">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
