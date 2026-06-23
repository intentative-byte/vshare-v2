import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const feedQuerySchema = z.object({
  topicId: uuidSchema.optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const topicSelectionSchema = z.object({
  topicId: uuidSchema,
  selected: z.boolean().default(true)
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  topicIds: z.array(uuidSchema).min(1).max(12),
  selectedTopicId: uuidSchema
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  selectedTopicId: uuidSchema.optional(),
  onboardingComplete: z.boolean().optional()
});

export const contentEventSchema = z.object({
  contentId: uuidSchema,
  eventType: z.enum(["view", "watch_time", "save", "like", "skip"]),
  watchTimeSeconds: z.number().int().min(0).max(24 * 60 * 60).default(0),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const calibrationSchema = contentEventSchema.pick({
  contentId: true,
  eventType: true,
  watchTimeSeconds: true
});
