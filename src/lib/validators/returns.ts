import { z } from "zod";

import { positiveIntegerIdSchema } from "./http";

const returnConditionValues = ["good", "damaged", "lost"] as const;

const returnItemSchema = z.object({
  borrowRequestItemId: positiveIntegerIdSchema,
  returnQty: z.coerce.number().int().positive(),
  condition: z.enum(returnConditionValues),
  note: z.string().trim().max(1000).optional(),
});

export const returnListQuerySchema = z.object({
  borrowRequestId: positiveIntegerIdSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const returnPreparationQuerySchema = z.object({
  borrowRequestId: positiveIntegerIdSchema.optional(),
});

export const returnCreateSchema = z.object({
  borrowRequestId: positiveIntegerIdSchema,
  returnedAt: z.string().datetime().optional(),
  note: z.string().trim().max(2000).optional(),
  items: z.array(returnItemSchema).min(1),
});

export const returnIdParamsSchema = z.object({
  id: positiveIntegerIdSchema,
});

export const returnUpdateSchema = z
  .object({
    note: z.string().trim().max(2000),
  })
  .refine((input) => input.note.length > 0, {
    message: "Note is required",
    path: ["note"],
  });

export type ReturnListQuery = z.infer<typeof returnListQuerySchema>;
export type ReturnPreparationQuery = z.infer<typeof returnPreparationQuerySchema>;
export type ReturnCreateInput = z.infer<typeof returnCreateSchema>;
export type ReturnUpdateInput = z.infer<typeof returnUpdateSchema>;
