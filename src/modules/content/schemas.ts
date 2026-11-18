import { z } from "zod";

/**
 * Input contracts for the catalogue.
 *
 * The length rules match the database constraints exactly, so a value that
 * passes here cannot be rejected later for being the wrong shape.
 */

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(8)
  .max(90)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");

/**
 * A source link. Only https, only a public host: no loopback, no private
 * range, no bare address. The server never fetches a submitted URL, so this
 * is about what we will show a reader, not about request forgery.
 */
export const sourceUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .url("Enter a full web address.")
  .refine((value) => value.startsWith("https://"), { message: "The address must start with https." })
  .refine(
    (value) => {
      try {
        const { hostname } = new URL(value);

        if (!hostname.includes(".") || hostname.endsWith(".local")) {
          return false;
        }

        if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/i.test(hostname)) {
          return false;
        }

        if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
          return false;
        }

        // A bare IP address is never a credible published source.
        return !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
      } catch {
        return false;
      }
    },
    { message: "Enter the address of a public web page." },
  );

export const takeawaysSchema = z
  .array(
    z
      .string()
      .trim()
      .min(10, "A takeaway needs to say something.")
      .max(240, "Keep a takeaway under 240 characters."),
  )
  .min(1, "Add at least one takeaway.")
  .max(3, "Three takeaways is the maximum.");

export const submitResourceInput = z
  .object({
    sourceUrl: sourceUrlSchema,
    sourceName: z.string().trim().min(2).max(120),
    title: z
      .string()
      .trim()
      .min(10, "Give it a title that says what it teaches.")
      .max(120, "Keep the title under 120 characters."),
    summary: z
      .string()
      .trim()
      .min(40, "Say a little more about why it is worth someone's time.")
      .max(600, "Keep the summary under 600 characters."),
    takeaways: takeawaysSchema,
    nextStep: z
      .string()
      .trim()
      .min(10, "Say what someone should do with it.")
      .max(300),
    topicId: z.string().uuid("Choose a topic."),
    format: z.enum(["article", "video", "podcast", "course", "tool", "book"]),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    estimatedMinutes: z.number().int().min(1).max(600),
  })
  .strict();

export type SubmitResourceInput = z.infer<typeof submitResourceInput>;

export const resubmitInput = z
  .object({
    contentId: z.string().uuid(),
    title: z.string().trim().min(10).max(120),
    summary: z.string().trim().min(40).max(600),
    takeaways: takeawaysSchema,
    nextStep: z.string().trim().min(10).max(300),
    sourceName: z.string().trim().min(2).max(120),
  })
  .strict();

export const moderateInput = z
  .object({
    contentId: z.string().uuid(),
    action: z.enum(["approve", "reject", "archive", "restore"]),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((value) => value.action !== "reject" || Boolean(value.reason), {
    message: "A rejection needs a reason the submitter can read.",
    path: ["reason"],
  })
  .refine((value) => value.action !== "archive" || Boolean(value.reason), {
    message: "Archiving needs a reason.",
    path: ["reason"],
  });

export const reportInput = z
  .object({
    contentId: z.string().uuid(),
    reason: z.enum(["broken_link", "inaccurate", "harmful", "spam", "copyright", "other"]),
    note: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

/**
 * Recording an authenticated editorial decision. The reviewer identity, the
 * timestamp and the publication-eligibility are NOT here: the server sets them
 * (`record_editorial_decision` uses `app.current_user_id()` and `now()`), so a
 * client can never choose who reviewed, when, or whether something may publish.
 * The decision binds to one immutable revision (`contentVersionId`).
 */
export const editorialDecisionInput = z
  .object({
    contentId: z.string().uuid(),
    contentVersionId: z.string().uuid("Pin the decision to a specific revision."),
    decision: z.enum(["approve", "request_revision", "reject", "escalate"]),
    rationale: z.string().trim().min(10, "Give a rationale a colleague can read.").max(2000),
    evidenceRef: z.string().trim().max(500).optional(),
  })
  .strict();

export type EditorialDecisionInput = z.infer<typeof editorialDecisionInput>;

export const searchInput = z
  .object({ query: z.string().trim().min(2).max(80) })
  .strict();

// -------------------------------------------------- admin: taxonomy ------

/**
 * Category and topic inputs for the admin interface.
 *
 * These match the database functions `upsert_category` and `upsert_topic`,
 * which enforce administrator access themselves. The schema is the first of
 * two checks, not the only one.
 */
export const categoryInput = z
  .object({
    id: z.string().uuid().optional(),
    slug: slugSchema,
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10, "Say what the category is for.").max(280),
    sortOrder: z.number().int().min(0).max(999).default(0),
    // High-impact is a property of the category: finance and health content
    // always needs a second reviewer, and that follows from this flag.
    isHighImpact: z.boolean().default(false),
  })
  .strict();

export const topicInput = z
  .object({
    id: z.string().uuid().optional(),
    categoryId: z.string().uuid("Choose a category."),
    slug: slugSchema,
    name: z.string().trim().min(2).max(80),
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .strict();

export const archiveInput = z
  .object({ id: z.string().uuid(), archived: z.boolean() })
  .strict();

// -------------------------------------------------- admin: cards ---------

/**
 * Creating a curated card. It enters as a draft with an unchecked link,
 * exactly like anything else: the admin interface cannot shortcut
 * publication, because `create_card` sets the status, not the caller.
 */
export const createCardInput = z
  .object({
    slug: slugSchema,
    topicId: z.string().uuid("Choose a topic."),
    sourceUrl: sourceUrlSchema,
    sourceName: z.string().trim().min(2).max(120),
    sourceAuthor: z.string().trim().max(120).optional(),
    title: z.string().trim().min(10).max(120),
    summary: z.string().trim().min(40).max(600),
    takeaways: takeawaysSchema,
    nextStep: z.string().trim().min(10).max(300),
    format: z.enum(["article", "video", "podcast", "course", "tool", "book"]),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    estimatedMinutes: z.number().int().min(1).max(600),
    qualityScore: z.number().int().min(0).max(100).default(50),
    isAiAssisted: z.boolean().default(false),
  })
  .strict();

/** A correction to a card: a new version, never an edit of an old one. */
export const cardVersionInput = z
  .object({
    contentId: z.string().uuid(),
    title: z.string().trim().min(10).max(120),
    summary: z.string().trim().min(40).max(600),
    takeaways: takeawaysSchema,
    nextStep: z.string().trim().min(10).max(300),
    sourceName: z.string().trim().min(2).max(120),
    sourceAuthor: z.string().trim().max(120).optional(),
  })
  .strict();
