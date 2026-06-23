"use client";

import { Check } from "lucide-react";
import type { Topic, UserTopicPreference } from "@/types/domain";
import { cn } from "@/lib/utils";

export function TopicSelector({
  topics,
  preferences = [],
  selectedTopicId,
  onSelect,
  compact = false,
  multiSelect = false,
  selectedTopicIds = []
}: {
  topics: Topic[];
  preferences?: UserTopicPreference[];
  selectedTopicId?: string | null;
  selectedTopicIds?: string[];
  onSelect: (topicId: string) => void;
  compact?: boolean;
  multiSelect?: boolean;
}) {
  const weighted = new Map(preferences.map((preference) => [preference.topic_id, preference.weight]));

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}>
      {topics.map((topic) => {
        const active = multiSelect
          ? selectedTopicIds.includes(topic.id)
          : selectedTopicId === topic.id;
        const weight = weighted.get(topic.id);

        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelect(topic.id)}
            className={cn(
              "group rounded-3xl border p-4 text-left transition",
              active
                ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                : "border-[var(--border)] bg-black/45 text-[var(--foreground)] hover:border-[var(--gold)] hover:bg-white/5",
              compact && "rounded-2xl p-3"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cn("font-black", compact ? "text-sm" : "text-lg")}>{topic.name}</p>
                {!compact ? (
                  <p className={cn("mt-1 text-sm", active ? "text-black/70" : "text-[var(--muted)]")}>
                    {topic.description}
                  </p>
                ) : null}
              </div>
              {active ? (
                <span className="rounded-full bg-black/15 p-1">
                  <Check size={16} />
                </span>
              ) : null}
            </div>
            {!compact && typeof weight === "number" ? (
              <p className={cn("mt-3 text-xs", active ? "text-black/70" : "text-[var(--muted)]")}>
                Memory weight {weight.toFixed(2)}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
