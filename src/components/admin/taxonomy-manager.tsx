"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextArea } from "@/components/ui/text-area";
import { SelectField } from "@/components/ui/select-field";
import {
  upsertCategory,
  upsertTopic,
  setCategoryArchived,
  setTopicArchived,
  type CategoryAdmin,
  type TopicAdmin,
} from "@/modules/content";

type Props = { categories: CategoryAdmin[]; topics: TopicAdmin[] };

const slugHint = "Lowercase words separated by hyphens, 8–90 characters.";

export function TaxonomyManager({ categories, topics }: Props) {
  const [tab, setTab] = useState<"categories" | "topics">("categories");

  return (
    <div>
      <div role="tablist" aria-label="What to manage" className="mb-6 flex gap-2">
        {(["categories", "topics"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ${
              tab === key
                ? "border-gold bg-raised text-white"
                : "border-border text-silver hover:bg-raised hover:text-white"
            }`}
          >
            {key === "categories" ? "Categories" : "Topics"}
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <CategoriesPanel categories={categories} />
      ) : (
        <TopicsPanel categories={categories} topics={topics} />
      )}
    </div>
  );
}

function CategoriesPanel({ categories }: { categories: CategoryAdmin[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section aria-label="Categories">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-white">Categories</h2>
        <Button variant="secondary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancel" : "New category"}
        </Button>
      </div>

      {creating ? <CategoryForm onDone={() => setCreating(false)} /> : null}

      <ul className="mt-4 grid gap-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            {editing === category.id ? (
              <CategoryForm category={category} onDone={() => setEditing(null)} />
            ) : (
              <CategoryRow
                category={category}
                onEdit={() => setEditing(category.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryRow({ category, onEdit }: { category: CategoryAdmin; onEdit: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggleArchive() {
    startTransition(async () => {
      await setCategoryArchived({ id: category.id, archived: category.archivedAt === null });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-white">
          {category.name}
          {category.archivedAt ? (
            <span className="ml-2 text-xs font-semibold tracking-wide text-silver-dim uppercase">
              Archived
            </span>
          ) : null}
          {category.isHighImpact ? (
            <span className="ml-2 text-xs font-semibold tracking-wide text-gold uppercase">
              High impact
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-silver">{category.description}</p>
        <p className="mt-1 text-xs text-silver-dim">
          {category.slug} · order {category.sortOrder} · {category.topicCount}{" "}
          {category.topicCount === 1 ? "topic" : "topics"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" disabled={isPending} onClick={toggleArchive}>
          {category.archivedAt ? "Restore" : "Archive"}
        </Button>
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category?: CategoryAdmin;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    slug: category?.slug ?? "",
    name: category?.name ?? "",
    description: category?.description ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
    isHighImpact: category?.isHighImpact ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    setErrors({});
    startTransition(async () => {
      const result = await upsertCategory({
        ...(category ? { id: category.id } : {}),
        slug: form.slug,
        name: form.name,
        description: form.description,
        sortOrder: Number(form.sortOrder) || 0,
        isHighImpact: form.isHighImpact,
      });

      if (!result.ok) {
        setErrors(result.error.fields ?? { _: result.error.message });
        return;
      }

      onDone();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <TextField
        id={`cat-name-${category?.id ?? "new"}`}
        label="Name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        error={errors.name}
      />
      <TextField
        id={`cat-slug-${category?.id ?? "new"}`}
        label="Slug"
        hint={slugHint}
        value={form.slug}
        onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
        error={errors.slug}
      />
      <TextArea
        id={`cat-desc-${category?.id ?? "new"}`}
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        error={errors.description}
      />
      <TextField
        id={`cat-order-${category?.id ?? "new"}`}
        label="Sort order"
        type="number"
        value={form.sortOrder}
        onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
        error={errors.sortOrder}
      />
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={form.isHighImpact}
          onChange={(e) => setForm((f) => ({ ...f, isHighImpact: e.target.checked }))}
          className="h-4 w-4"
        />
        High impact — cards here always need a second reviewer
      </label>
      {errors._ ? <p className="text-sm font-semibold text-danger">{errors._}</p> : null}
      <div className="flex gap-2">
        <Button disabled={isPending} onClick={submit}>
          {category ? "Save changes" : "Create category"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function TopicsPanel({
  categories,
  topics,
}: {
  categories: CategoryAdmin[];
  topics: TopicAdmin[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const liveCategories = categories.filter((c) => c.archivedAt === null);

  return (
    <section aria-label="Topics">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-white">Topics</h2>
        <Button
          variant="secondary"
          disabled={liveCategories.length === 0}
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Cancel" : "New topic"}
        </Button>
      </div>

      {liveCategories.length === 0 ? (
        <p className="text-sm text-silver-dim">Create a category before adding topics.</p>
      ) : null}

      {creating ? (
        <TopicForm categories={liveCategories} onDone={() => setCreating(false)} />
      ) : null}

      <ul className="mt-4 grid gap-3">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="rounded-[var(--radius-card)] border border-border bg-surface p-4"
          >
            {editing === topic.id ? (
              <TopicForm
                categories={liveCategories}
                topic={topic}
                onDone={() => setEditing(null)}
              />
            ) : (
              <TopicRow topic={topic} onEdit={() => setEditing(topic.id)} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopicRow({ topic, onEdit }: { topic: TopicAdmin; onEdit: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggleArchive() {
    startTransition(async () => {
      await setTopicArchived({ id: topic.id, archived: topic.archivedAt === null });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-white">
          {topic.name}
          {topic.archivedAt ? (
            <span className="ml-2 text-xs font-semibold tracking-wide text-silver-dim uppercase">
              Archived
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-silver-dim">
          {topic.categoryName} · {topic.slug} · order {topic.sortOrder}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" disabled={isPending} onClick={toggleArchive}>
          {topic.archivedAt ? "Restore" : "Archive"}
        </Button>
      </div>
    </div>
  );
}

function TopicForm({
  categories,
  topic,
  onDone,
}: {
  categories: CategoryAdmin[];
  topic?: TopicAdmin;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    categoryId: topic?.categoryId ?? categories[0]?.id ?? "",
    slug: topic?.slug ?? "",
    name: topic?.name ?? "",
    sortOrder: String(topic?.sortOrder ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    setErrors({});
    startTransition(async () => {
      const result = await upsertTopic({
        ...(topic ? { id: topic.id } : {}),
        categoryId: form.categoryId,
        slug: form.slug,
        name: form.name,
        sortOrder: Number(form.sortOrder) || 0,
      });

      if (!result.ok) {
        setErrors(result.error.fields ?? { _: result.error.message });
        return;
      }

      onDone();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <SelectField
        id={`topic-cat-${topic?.id ?? "new"}`}
        label="Category"
        value={form.categoryId}
        onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        error={errors.categoryId}
      />
      <TextField
        id={`topic-name-${topic?.id ?? "new"}`}
        label="Name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        error={errors.name}
      />
      <TextField
        id={`topic-slug-${topic?.id ?? "new"}`}
        label="Slug"
        hint={slugHint}
        value={form.slug}
        onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
        error={errors.slug}
      />
      <TextField
        id={`topic-order-${topic?.id ?? "new"}`}
        label="Sort order"
        type="number"
        value={form.sortOrder}
        onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
        error={errors.sortOrder}
      />
      {errors._ ? <p className="text-sm font-semibold text-danger">{errors._}</p> : null}
      <div className="flex gap-2">
        <Button disabled={isPending} onClick={submit}>
          {topic ? "Save changes" : "Create topic"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
