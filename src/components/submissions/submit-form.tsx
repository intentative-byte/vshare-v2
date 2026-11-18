"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { submitResource } from "@/modules/content";

type Group = { category: string; topics: Array<{ id: string; name: string }> };

/**
 * Submitting a resource.
 *
 * The form mirrors the server contract exactly, so a value that passes here
 * cannot be rejected later for being the wrong shape. Nothing submitted is
 * published: it joins the moderation queue, and the person is told so.
 */
export function SubmitForm({ groups }: { groups: Group[] }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [topicId, setTopicId] = useState("");
  const [format, setFormat] = useState("article");
  const [level, setLevel] = useState("beginner");
  const [minutes, setMinutes] = useState(10);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await submitResource({
        sourceUrl,
        sourceName,
        title,
        summary,
        takeaways: [takeaway],
        nextStep,
        topicId,
        format: format as "article",
        level: level as "beginner",
        estimatedMinutes: minutes,
      });

      if (!result.ok) {
        setFieldErrors(result.error.fields ?? {});

        if (!result.error.fields) {
          setError(result.error.message);
        }

        return;
      }

      setSent(true);
    });
  }

  if (sent) {
    return (
      <Card emphasis>
        <CardTitle>Thank you — it is with a moderator</CardTitle>
        <CardBody className="mt-2">
          Nothing is published automatically. A person will read your submission, check the source
          works, and either publish it or tell you why not. You can follow it on your submissions
          page.
        </CardBody>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/you/submissions"
            className="font-semibold text-blue underline hover:text-white"
          >
            See my submissions
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        id="source-url"
        label="Link to the resource"
        hint="The page itself, not a search result or a tracking link. It must be a public https address."
        type="url"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        error={fieldErrors.sourceUrl}
        required
      />

      <TextField
        id="source-name"
        label="Who published it"
        hint="The organisation or person behind the page."
        value={sourceName}
        onChange={(event) => setSourceName(event.target.value)}
        error={fieldErrors.sourceName}
        required
      />

      <TextField
        id="title"
        label="Title"
        hint="Say what someone will learn, in your own words. Not the page's own headline."
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldErrors.title}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary" className="text-sm font-semibold text-text">
          Why is it worth someone&apos;s time?
        </label>
        <p id="summary-hint" className="text-sm text-silver-dim">
          Two or three sentences in your own words. Do not paste from the page.
        </p>
        <textarea
          id="summary"
          rows={4}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          aria-describedby="summary-hint"
          aria-invalid={fieldErrors.summary ? true : undefined}
          required
          className="rounded-[var(--radius-control)] border border-border-strong bg-raised p-3 text-text"
        />
        {fieldErrors.summary ? (
          <p className="text-sm font-semibold text-danger">{fieldErrors.summary}</p>
        ) : null}
      </div>

      <TextField
        id="takeaway"
        label="One thing a reader takes away"
        hint="A single sentence someone could repeat afterwards."
        value={takeaway}
        onChange={(event) => setTakeaway(event.target.value)}
        error={fieldErrors["takeaways.0"] ?? fieldErrors.takeaways}
        required
      />

      <TextField
        id="next-step"
        label="What should they do with it?"
        hint="Something concrete and doable this week."
        value={nextStep}
        onChange={(event) => setNextStep(event.target.value)}
        error={fieldErrors.nextStep}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-text">Topic</span>
          <select
            value={topicId}
            onChange={(event) => setTopicId(event.target.value)}
            required
            className="min-h-11 rounded-[var(--radius-control)] border border-border-strong bg-raised px-3 text-text"
          >
            <option value="">Choose a topic</option>
            {groups.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {fieldErrors.topicId ? (
            <span className="text-sm font-semibold text-danger">{fieldErrors.topicId}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-text">Format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="min-h-11 rounded-[var(--radius-control)] border border-border-strong bg-raised px-3 text-text"
          >
            {["article", "video", "podcast", "course", "tool", "book"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-text">Level</span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="min-h-11 rounded-[var(--radius-control)] border border-border-strong bg-raised px-3 text-text"
          >
            {["beginner", "intermediate", "advanced"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <TextField
          id="minutes"
          label="How long does it take?"
          hint="In minutes."
          type="number"
          min={1}
          max={600}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          error={fieldErrors.estimatedMinutes}
        />
      </div>

      <div>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sending…" : "Send to a moderator"}
        </Button>
      </div>

      <div role="alert">
        {error ? (
          <p className="rounded-[var(--radius-control)] border border-danger/40 bg-danger/5 p-3 text-sm text-text">
            {error}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-silver-dim">
        Submissions are reviewed by a person before anything is published, and the source link is
        checked automatically. Nothing you send here goes live on its own.
      </p>
    </form>
  );
}
