"use server";

import { defineAction } from "@/platform/action";
import { fail, failWithDefault, ok } from "@/platform/result";
import { rateLimitRules } from "@/platform/rate-limit";
import {
  archiveInput,
  cardVersionInput,
  categoryInput,
  createCardInput,
  editorialDecisionInput,
  topicInput,
} from "./schemas";
import {
  callAddVersion,
  callCreateCard,
  callRecordEditorialDecision,
  callSetArchived,
  callUpsertCategory,
  callUpsertTopic,
  getEditorialPublicationEligible,
} from "./repository";

/**
 * Administrative catalogue and taxonomy actions.
 *
 * Access is "admin" for taxonomy and "moderator" for cards, checked by the
 * pipeline here and again inside each database function. A reused slug is the
 * one error a careful admin will still hit, so it is turned into a field
 * error rather than a bare failure.
 */

function slugConflict(message: string): boolean {
  return /duplicate key|unique constraint|already exists/i.test(message);
}

export const upsertCategory = defineAction({
  name: "content.upsertCategory",
  access: "admin",
  input: categoryInput,
  handler: async (input) => {
    const result = await callUpsertCategory(input);

    if ("error" in result) {
      return slugConflict(result.error)
        ? fail("CONFLICT", "That slug is already in use.", {
            fields: { slug: "Another category already uses this slug." },
          })
        : failWithDefault("UNAVAILABLE");
    }

    return ok({ id: result.id });
  },
});

export const upsertTopic = defineAction({
  name: "content.upsertTopic",
  access: "admin",
  input: topicInput,
  handler: async (input) => {
    const result = await callUpsertTopic(input);

    if ("error" in result) {
      return slugConflict(result.error)
        ? fail("CONFLICT", "That slug is already in use.", {
            fields: { slug: "Another topic already uses this slug." },
          })
        : failWithDefault("UNAVAILABLE");
    }

    return ok({ id: result.id });
  },
});

export const setCategoryArchived = defineAction({
  name: "content.setCategoryArchived",
  access: "admin",
  input: archiveInput,
  handler: async ({ id, archived }) => {
    const failure = await callSetArchived("category", id, archived);
    return failure ? failWithDefault("UNAVAILABLE") : ok({ archived });
  },
});

export const setTopicArchived = defineAction({
  name: "content.setTopicArchived",
  access: "admin",
  input: archiveInput,
  handler: async ({ id, archived }) => {
    const failure = await callSetArchived("topic", id, archived);
    return failure ? failWithDefault("UNAVAILABLE") : ok({ archived });
  },
});

export const createCard = defineAction({
  name: "content.createCard",
  access: "moderator",
  input: createCardInput,
  rateLimit: rateLimitRules.staffWritePerUser,
  handler: async (input) => {
    const result = await callCreateCard(input);

    if ("error" in result) {
      return slugConflict(result.error)
        ? fail("CONFLICT", "That slug is already in use.", {
            fields: { slug: "Another card already uses this slug." },
          })
        : failWithDefault("UNAVAILABLE");
    }

    // It enters as a draft with an unchecked link, like everything else.
    return ok({ id: result.id, status: "draft" as const });
  },
});

export const addCardVersion = defineAction({
  name: "content.addCardVersion",
  access: "moderator",
  input: cardVersionInput,
  rateLimit: rateLimitRules.staffWritePerUser,
  handler: async (input) => {
    const failure = await callAddVersion(input);
    return failure ? failWithDefault("UNAVAILABLE") : ok({ done: true } as const);
  },
});

/**
 * Record an authenticated editorial decision in the append-only ledger.
 *
 * The pipeline authorises a moderator/admin, and the database function
 * authorises again and sets the reviewer identity, the timestamp and the
 * publication-eligibility itself — none of which the client can supply. This
 * records a decision only; it never publishes (publication stays a separate,
 * explicit moderation step). A duplicate approval by the same reviewer is the
 * one error a careful reviewer will hit, so it becomes a clear message.
 */
export const recordEditorialDecision = defineAction({
  name: "content.recordEditorialDecision",
  access: "moderator",
  input: editorialDecisionInput,
  rateLimit: rateLimitRules.staffWritePerUser,
  handler: async (input) => {
    const result = await callRecordEditorialDecision(input);

    if ("error" in result) {
      if (/already approved/i.test(result.error)) {
        return fail("CONFLICT", "You have already approved this revision.");
      }
      if (/not an authorised staff|revision does not belong/i.test(result.error)) {
        return failWithDefault("FORBIDDEN");
      }
      return failWithDefault("UNAVAILABLE");
    }

    // Eligibility is reported read-only; it never triggers publication here.
    const publicationEligible = await getEditorialPublicationEligible(input.contentId);

    return ok({ id: result.id, publicationEligible });
  },
});
