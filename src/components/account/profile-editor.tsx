"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card, CardTitle } from "@/components/ui/card";
import { updateProfile, type Profile } from "@/modules/profiles";

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProfile({
        handle,
        displayName: displayName.trim() === "" ? null : displayName.trim(),
        isPublic,
      });

      if (!result.ok) {
        setFieldErrors(result.error.fields ?? {});

        if (!result.error.fields) {
          setError(result.error.message);
        }

        return;
      }

      setHandle(result.data.handle);
      setDisplayName(result.data.displayName ?? "");
      setIsPublic(result.data.isPublic);
      setMessage("Saved.");
    });
  }

  return (
    <Card>
      <CardTitle>Profile</CardTitle>

      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          id="handle"
          label="Handle"
          hint="Lowercase letters, numbers and underscores."
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          error={fieldErrors.handle}
        />

        <TextField
          id="display-name"
          label="Display name"
          hint="Optional. Leave empty to show your handle instead."
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={fieldErrors.displayName}
        />

        <div className="flex items-start gap-3">
          <input
            id="is-public"
            type="checkbox"
            checked={isPublic}
            disabled={profile.isGuest}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="mt-1 size-5 accent-[var(--color-gold)]"
            aria-describedby="is-public-hint"
          />
          <label htmlFor="is-public" className="text-sm">
            <span className="font-semibold text-text">Make my profile visible to others</span>
            <span id="is-public-hint" className="mt-1 block text-silver-dim">
              {profile.isGuest
                ? "Available once you have an account."
                : "Off by default. Only your handle and display name are shown."}
            </span>
          </label>
        </div>

        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>

        <div role="status" aria-live="polite">
          {message ? <p className="text-sm font-semibold text-success">{message}</p> : null}
        </div>
        <div role="alert">
          {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
        </div>
      </form>
    </Card>
  );
}
