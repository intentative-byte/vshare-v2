"use server";

import { z } from "zod";
import { defineAction } from "@/platform/action";
import { failWithDefault, ok } from "@/platform/result";
import { rateLimitRules } from "@/platform/rate-limit";
import { createRequestClient } from "@/platform/db/server";
import { eventNames } from "./events";
import { loadFirstWinMetrics, recordEvent, recordFirstCompletionSeconds } from "./repository";

/**
 * Event recording from the browser.
 *
 * Open to anyone, including a visitor with no account: the aggregate it
 * feeds holds no identifiers. An identified record is written only where
 * consent has been granted, and that decision is made in the database.
 */
export const track = defineAction({
  name: "analytics.track",
  access: "public",
  input: z
    .object({
      name: z.enum(eventNames),
      dimension: z.string().max(30).optional(),
      dimensionKey: z.string().max(60).optional(),
      // Bounded, so a stray client cannot distort the mean with nonsense.
      value: z.number().min(0).max(86_400).optional(),
      sessionId: z.string().uuid().optional(),
      contentId: z.string().uuid().optional(),
      topicId: z.string().uuid().optional(),
    })
    .strict(),
  rateLimit: rateLimitRules.eventsPerSession,
  handler: async (input) => {
    await recordEvent(input);
    return ok({ recorded: true } as const);
  },
});

export const setAnalyticsConsent = defineAction({
  name: "analytics.setConsent",
  access: "viewer",
  input: z.object({ consent: z.enum(["granted", "denied"]) }).strict(),
  handler: async ({ consent }, context) => {
    if (!context.viewer) {
      return failWithDefault("UNAUTHENTICATED");
    }

    const supabase = await createRequestClient();

    // Withdrawing consent deletes what was collected under it; a database
    // trigger does that, so it cannot be forgotten here.
    const { error } = await supabase
      .from("preferences")
      .update({ analytics_consent: consent })
      .eq("user_id", context.viewer.userId);

    return error ? failWithDefault("UNAVAILABLE") : ok({ consent });
  },
});

export const getFirstWinMetrics = defineAction({
  name: "analytics.getFirstWinMetrics",
  access: "moderator",
  input: z.object({ days: z.number().int().min(1).max(90).optional() }).strict(),
  handler: async ({ days }) => ok(await loadFirstWinMetrics(days ?? 30)),
});

/**
 * The first-win timer.
 *
 * Open to anyone with an account, including a guest — a completion always
 * creates one. The database refuses a second report and refuses one from
 * someone who has completed nothing, so this cannot be used to manufacture
 * a benchmark.
 */
export const reportFirstWinSeconds = defineAction({
  name: "analytics.reportFirstWinSeconds",
  access: "viewer",
  input: z.object({ seconds: z.number().int().min(0).max(86_400) }).strict(),
  rateLimit: rateLimitRules.eventsPerSession,
  handler: async ({ seconds }) => {
    await recordFirstCompletionSeconds(seconds);
    return ok({ reported: true } as const);
  },
});
