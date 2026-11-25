"use server";

import { z } from "zod";
import { defineAction } from "@/platform/action";
import { fail, failWithDefault, ok } from "@/platform/result";
import { rateLimitRules } from "@/platform/rate-limit";
import { moderateInput, reportInput, resubmitInput, submitResourceInput } from "./schemas";
import {
  callModerate,
  callReport,
  callResubmit,
  callSubmitResource,
  listCardsForReview,
  listMySubmissions,
} from "./repository";

/**
 * Catalogue actions.
 *
 * Authorisation is checked here and again inside the database functions
 * these call, so a mistake in one layer is caught by the other.
 */

export const submitResource = defineAction({
  name: "content.submitResource",
  // A guest may learn and save, but not put things into the queue.
  access: "account",
  input: submitResourceInput,
  rateLimit: rateLimitRules.submissionPerUser,
  handler: async (input) => {
    const slug = `${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70)}-${Math.random().toString(36).slice(2, 8)}`;

    const id = await callSubmitResource({
      p_slug: slug,
      p_primary_topic_id: input.topicId,
      p_source_url: input.sourceUrl,
      p_source_name: input.sourceName,
      p_title: input.title,
      p_summary: input.summary,
      p_takeaways: input.takeaways,
      p_next_step: input.nextStep,
      p_format: input.format,
      p_level: input.level,
      p_estimated_minutes: input.estimatedMinutes,
    });

    if (!id) {
      return fail(
        "CONFLICT",
        "We could not add that. It may already be in the catalogue.",
        { fields: { sourceUrl: "This link may already have been submitted." } },
      );
    }

    return ok({ id, status: "pending" as const });
  },
});

export const reportCard = defineAction({
  name: "content.reportCard",
  access: "account",
  input: reportInput,
  rateLimit: rateLimitRules.reportPerUser,
  handler: async (input) => {
    const reported = await callReport(input.contentId, input.reason, input.note ?? null);

    if (!reported) {
      return fail("CONFLICT", "You have already reported this.");
    }

    return ok({ reported: true } as const);
  },
});

/** Correcting a rejected submission and sending it back. */
export const resubmitResource = defineAction({
  name: "content.resubmitResource",
  access: "account",
  input: resubmitInput,
  rateLimit: rateLimitRules.submissionPerUser,
  handler: async ({ contentId, ...fields }) => {
    const failure = await callResubmit(contentId, fields);

    if (failure) {
      if (failure.includes("not your submission")) {
        return failWithDefault("FORBIDDEN");
      }

      if (failure.includes("only a rejected submission")) {
        return fail("CONFLICT", "Only a rejected submission can be corrected.");
      }

      return failWithDefault("UNAVAILABLE");
    }

    return ok({ status: "pending" as const });
  },
});

export const getMySubmissions = defineAction({
  name: "content.getMySubmissions",
  access: "account",
  input: z.object({}).strict(),
  handler: async () => ok(await listMySubmissions()),
});

export const getModerationQueue = defineAction({
  name: "content.getModerationQueue",
  access: "moderator",
  input: z.object({ status: z.enum(["pending", "draft", "rejected", "published"]) }).strict(),
  handler: async ({ status }) => ok(await listCardsForReview(status)),
});

export const moderateCard = defineAction({
  name: "content.moderateCard",
  access: "moderator",
  input: moderateInput,
  handler: async (input) => {
    const failure = await callModerate(input.contentId, input.action, input.reason ?? null);

    if (failure) {
      // The database refused. Its message explains which rule stopped it:
      // an unchecked link, or high-impact content needing a second reviewer.
      if (failure.includes("link has not been checked")) {
        return fail("FORBIDDEN", "The source link has not been checked yet.");
      }

      if (failure.includes("reviewer who did not submit it")) {
        return fail(
          "FORBIDDEN",
          "This is high-impact content. Someone other than its author has to approve it.",
        );
      }

      return failWithDefault("UNAVAILABLE");
    }

    return ok({ done: true } as const);
  },
});
