"use server";

import { z } from "zod";
import { defineAction } from "@/platform/action";
import { failWithDefault, ok } from "@/platform/result";
import { rateLimitRules } from "@/platform/rate-limit";
import { createRequestClient } from "@/platform/db/server";

/**
 * What someone did with a card.
 *
 * Opening and completing are different things and are recorded separately.
 * Only completion counts as progress, and only the person can say they have
 * completed something — it is never inferred from how long a page was open.
 */

export type InteractionState = {
  opened: boolean;
  completed: boolean;
  saved: boolean;
  liked: boolean;
  skipped: boolean;
  feedback: "useful" | "not_useful" | null;
  changed: boolean;
};

const interactionInput = z
  .object({
    contentId: z.string().uuid(),
    kind: z.enum(["open", "complete", "save", "like", "skip", "useful", "not_useful"]),
    value: z.boolean().optional(),
  })
  .strict();

export const setInteraction = defineAction({
  name: "progress.setInteraction",
  // A guest may learn and save; the account is created by this first write.
  access: "viewer",
  input: interactionInput,
  rateLimit: rateLimitRules.interactionPerUser,
  handler: async ({ contentId, kind, value }) => {
    const supabase = await createRequestClient();

    const { data, error } = await supabase.rpc("set_interaction", {
      p_content_id: contentId,
      p_kind: kind,
      p_value: value ?? true,
    });

    if (error) {
      return failWithDefault("UNAVAILABLE");
    }

    return ok(data as unknown as InteractionState);
  },
});

export const listSaved = defineAction({
  name: "progress.listSaved",
  access: "viewer",
  input: z.object({}).strict(),
  handler: async () => {
    const supabase = await createRequestClient();

    const { data, error } = await supabase
      .from("content_interactions")
      .select(
        `content_id, saved_at,
         content:content_items (
           slug, level, estimated_minutes,
           topic:topics!content_items_primary_topic_id_fkey ( name ),
           version:content_versions!content_items_current_version_id_fkey ( title, summary )
         )`,
      )
      .not("saved_at", "is", null)
      .order("saved_at", { ascending: false })
      .limit(100);

    if (error || !data) {
      return failWithDefault("UNAVAILABLE");
    }

    return ok(
      data.map((row) => {
        const content = row.content as unknown as {
          slug: string;
          level: string;
          estimated_minutes: number;
          topic: { name: string } | null;
          version: { title: string; summary: string } | null;
        } | null;

        return {
          contentId: row.content_id as string,
          slug: content?.slug ?? "",
          title: content?.version?.title ?? "",
          summary: content?.version?.summary ?? "",
          topicName: content?.topic?.name ?? "",
          level: content?.level ?? "beginner",
          estimatedMinutes: content?.estimated_minutes ?? 0,
          savedAt: row.saved_at as string,
        };
      }),
    );
  },
});

export const getProgressSummary = defineAction({
  name: "progress.getProgressSummary",
  access: "viewer",
  input: z.object({}).strict(),
  handler: async () => {
    const supabase = await createRequestClient();

    const { data, error } = await supabase
      .from("content_interactions")
      .select("completed_at, completed_minutes, saved_at")
      .not("completed_at", "is", null);

    if (error || !data) {
      return failWithDefault("UNAVAILABLE");
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completedThisWeek = data.filter(
      (row) => new Date(row.completed_at as string).getTime() >= weekAgo,
    );

    const minutes = (rows: typeof data) =>
      rows.reduce((total, row) => total + ((row.completed_minutes as number) ?? 0), 0);

    const activeDays = new Set(
      data.map((row) => (row.completed_at as string).slice(0, 10)),
    ).size;

    // Every number here comes from a completion record. Nothing counts
    // impressions, opens or time on the page.
    return ok({
      week: { completed: completedThisWeek.length, minutes: minutes(completedThisWeek) },
      allTime: { completed: data.length, minutes: minutes(data), activeDays },
    });
  },
});
