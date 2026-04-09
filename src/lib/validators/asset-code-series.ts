import { z } from "zod";

import { positiveIntegerIdSchema } from "./http";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? null : value;

const optionalDescriptionSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().max(255).nullable().optional(),
);

const seriesBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  prefix: z.string().trim().min(1).max(20),
  separator: z.string().trim().min(1).max(5).default("-"),
  padLength: z.coerce.number().int().min(1).max(12).default(4),
  description: optionalDescriptionSchema,
});

export const seriesCreateSchema = seriesBaseSchema.transform((input) => ({
  ...input,
  description: input.description ?? null,
}));

export const seriesUpdateSchema = seriesBaseSchema
  .partial()
  .transform((input) => ({
    ...input,
    description:
      input.description === undefined ? undefined : (input.description ?? null),
  }))
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  });

export const seriesIdParamsSchema = z.object({
  id: positiveIntegerIdSchema,
});

export type SeriesCreateInput = z.infer<typeof seriesCreateSchema>;
export type SeriesUpdateInput = z.infer<typeof seriesUpdateSchema>;
