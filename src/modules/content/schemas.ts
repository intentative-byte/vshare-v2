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

export const searchInput = z
  .object({ query: z.string().trim().min(2).max(80) })
  .strict();
