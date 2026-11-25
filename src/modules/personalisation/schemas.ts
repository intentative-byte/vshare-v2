import { z } from "zod";

export const updatePreferencesInput = z
  .object({
    personalisationEnabled: z.boolean().optional(),
    analyticsConsent: z.enum(["unset", "granted", "denied"]).optional(),
    sessionMinutes: z
      .number()
      .int("Choose a whole number of minutes.")
      .min(5, "Choose at least five minutes.")
      .max(60, "Choose at most sixty minutes.")
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to change." });

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>;
