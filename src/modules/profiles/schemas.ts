import { z } from "zod";

/**
 * Input contracts for the profiles module. These are the single source of
 * truth: the server validates with them and the forms are typed from them.
 */

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least three characters.")
  .max(24, "Use at most twenty-four characters.")
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name, or leave this empty.")
  .max(60, "Use at most sixty characters.");

export const updateProfileInput = z
  .object({
    handle: handleSchema.optional(),
    displayName: displayNameSchema.nullable().optional(),
    isPublic: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to change.",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const signInInput = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
    next: z.string().optional(),
  })
  .strict();

export const providerSignInInput = z
  .object({
    provider: z.literal("google"),
    next: z.string().optional(),
  })
  .strict();

export const signOutInput = z.object({ everywhere: z.boolean().optional() }).strict();

export const upgradeGuestInput = z
  .object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254) })
  .strict();
