"use server";

import { z } from "zod";
import { defineAction } from "@/platform/action";
import { fail, failWithDefault, ok } from "@/platform/result";
import { rateLimitRules } from "@/platform/rate-limit";
import { createRequestClient } from "@/platform/db/server";
import { readMyPreferences } from "@/modules/personalisation";
import { buildSession, explainRecommendation, finishSession } from "./service";

/**
 * Feed actions.
 *
 * A session is built for the signed-in or guest viewer. A visitor with no
 * account yet gets one created by the first action that needs to persist
 * something, which is how browsing stays anonymous until it cannot be.
 */

export const getFeedSession = defineAction({
  name: "feed.getFeedSession",
  access: "viewer",
  input: z
    .object({
      topicId: z.string().uuid().nullable().optional(),
      size: z.number().int().min(1).max(20).optional(),
    })
    .strict(),
  handler: async (input) => {
    const preferences = await readMyPreferences();

    const session = await buildSession({
      topicId: input.topicId ?? null,
      personalisationEnabled: preferences?.personalisationEnabled ?? true,
      preferredMinutes: preferences?.sessionMinutes ?? 10,
      ...(input.size === undefined ? {} : { size: input.size }),
    });

    if (!session) {
      return failWithDefault("UNAVAILABLE");
    }

    return ok(session);
  },
});

export const recordImpressions = defineAction({
  name: "feed.recordImpressions",
  access: "viewer",
  input: z
    .object({
      sessionId: z.string().uuid(),
      contentIds: z.array(z.string().uuid()).min(1).max(20),
    })
    .strict(),
  rateLimit: rateLimitRules.eventsPerSession,
  handler: async ({ sessionId, contentIds }) => {
    const supabase = await createRequestClient();

    const { data, error } = await supabase.rpc("record_impressions", {
      p_content_ids: contentIds,
      p_session_id: sessionId,
    });

    if (error) {
      return failWithDefault("UNAVAILABLE");
    }

    return ok({ counted: data as number });
  },
});

export const whyThis = defineAction({
  name: "feed.whyThis",
  access: "viewer",
  input: z
    .object({
      sessionId: z.string().uuid(),
      contentId: z.string().uuid(),
      topicName: z.string().min(1).max(60),
    })
    .strict(),
  handler: async ({ sessionId, contentId, topicName }) => {
    const preferences = await readMyPreferences();
    const reasons = await explainRecommendation(
      sessionId,
      contentId,
      topicName,
      preferences?.personalisationEnabled ?? true,
    );

    return ok({ reasons });
  },
});

export const endFeedSession = defineAction({
  name: "feed.endFeedSession",
  access: "viewer",
  input: z.object({ sessionId: z.string().uuid() }).strict(),
  handler: async ({ sessionId }) => {
    const summary = await finishSession(sessionId);

    if (!summary) {
      return fail("NOT_FOUND", "That session has already finished.");
    }

    return ok(summary);
  },
});
