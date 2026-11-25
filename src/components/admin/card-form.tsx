"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextArea } from "@/components/ui/text-area";
import { SelectField } from "@/components/ui/select-field";
import { createCard, type TopicAdmin } from "@/modules/content";

type Props = { topics: TopicAdmin[] };

/**
 * Create a curated card. It enters as a draft with an unchecked link — the
 * form cannot do otherwise, because create_card sets the status, not this
 * component. Publishing it is a separate, reviewed step.
 */
export function CardForm({ topics }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    slug: "",
    topicId: topics[0]?.id ?? "",
    sourceUrl: "",
    sourceName: "",
    sourceAuthor: "",
    summary: "",
    takeaways: "",
    nextStep: "",
    format: "article",
    level: "beginner",
    estimatedMinutes: "5",
    qualityScore: "50",
    isAiAssisted: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setErrors({});
    const takeaways = form.takeaways
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await createCard({
        slug: form.slug,
        topicId: form.topicId,
        sourceUrl: form.sourceUrl,
        sourceName: form.sourceName,
        ...(form.sourceAuthor.trim() ? { sourceAuthor: form.sourceAuthor.trim() } : {}),
        title: form.title,
        summary: form.summary,
        takeaways,
        nextStep: form.nextStep,
        format: form.format as "article",
        level: form.level as "beginner",
        estimatedMinutes: Number(form.estimatedMinutes) || 0,
        qualityScore: Number(form.qualityScore) || 0,
        isAiAssisted: form.isAiAssisted,
      });

      if (!result.ok) {
        setErrors(
          result.error.fields ?? { _: result.error.message },
        );
        return;
      }

      router.push(`/admin/cards/${result.data.id}`);
    });
  }

  if (topics.length === 0) {
    return (
      <p className="text-sm text-silver-dim">
        There are no topics yet. Add one under Taxonomy before creating a card.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <TextField
        id="card-title"
        label="Title"
        hint="What someone will learn, in your words. Not the page's own headline."
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
      />
      <TextField
        id="card-slug"
        label="Slug"
        hint="Lowercase words separated by hyphens, 8–90 characters."
        value={form.slug}
        onChange={(e) => set("slug", e.target.value)}
        error={errors.slug}
      />
      <SelectField
        id="card-topic"
        label="Topic"
        value={form.topicId}
        onChange={(e) => set("topicId", e.target.value)}
        options={topics.map((t) => ({ value: t.id, label: `${t.categoryName} · ${t.name}` }))}
        error={errors.topicId}
      />
      <TextField
        id="card-source-url"
        label="Source link"
        hint="The page itself, a public https address."
        value={form.sourceUrl}
        onChange={(e) => set("sourceUrl", e.target.value)}
        error={errors.sourceUrl}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="card-source-name"
          label="Publisher"
          value={form.sourceName}
          onChange={(e) => set("sourceName", e.target.value)}
          error={errors.sourceName}
        />
        <TextField
          id="card-source-author"
          label="Author (optional)"
          value={form.sourceAuthor}
          onChange={(e) => set("sourceAuthor", e.target.value)}
          error={errors.sourceAuthor}
        />
      </div>
      <TextArea
        id="card-summary"
        label="Summary"
        hint="Why it is worth someone's time, 40–600 characters."
        value={form.summary}
        onChange={(e) => set("summary", e.target.value)}
        error={errors.summary}
      />
      <TextArea
        id="card-takeaways"
        label="Takeaways"
        hint="One per line, up to three. Each at least 10 characters."
        value={form.takeaways}
        onChange={(e) => set("takeaways", e.target.value)}
        error={errors.takeaways}
      />
      <TextField
        id="card-next-step"
        label="Next step"
        hint="What someone should actually do with it."
        value={form.nextStep}
        onChange={(e) => set("nextStep", e.target.value)}
        error={errors.nextStep}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="card-format"
          label="Format"
          value={form.format}
          onChange={(e) => set("format", e.target.value)}
          options={["article", "video", "podcast", "course", "tool", "book"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
        <SelectField
          id="card-level"
          label="Level"
          value={form.level}
          onChange={(e) => set("level", e.target.value)}
          options={["beginner", "intermediate", "advanced"].map((v) => ({ value: v, label: v }))}
        />
        <TextField
          id="card-minutes"
          label="Estimated minutes"
          type="number"
          value={form.estimatedMinutes}
          onChange={(e) => set("estimatedMinutes", e.target.value)}
          error={errors.estimatedMinutes}
        />
        <TextField
          id="card-quality"
          label="Quality score (0–100)"
          type="number"
          value={form.qualityScore}
          onChange={(e) => set("qualityScore", e.target.value)}
          error={errors.qualityScore}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={form.isAiAssisted}
          onChange={(e) => set("isAiAssisted", e.target.checked)}
          className="h-4 w-4"
        />
        This card was drafted with AI assistance
      </label>

      <p className="rounded-[var(--radius-control)] border border-border bg-raised p-3 text-sm text-silver">
        It will be created as a <strong className="text-text">draft</strong>. Its link must be
        checked by the verifier and it must be reviewed before it can be published — this form
        cannot shortcut either step.
      </p>

      {errors._ ? <p className="text-sm font-semibold text-danger">{errors._}</p> : null}
      <div>
        <Button disabled={isPending} onClick={submit}>
          Create draft
        </Button>
      </div>
    </div>
  );
}
