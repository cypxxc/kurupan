import { z } from "zod";

import { positiveIntegerIdSchema } from "./http";

const assetStatusValues = ["available", "maintenance", "retired"] as const;

export const assetListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(100).optional().default(""),
  location: z.string().trim().max(255).optional().default(""),
  status: z.enum(assetStatusValues).optional(),
});

export const assetCreateSchema = z
  .object({
    assetCode: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(255),
    category: z.string().trim().max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(2000).optional(),
    totalQty: z.coerce.number().int().min(0),
    availableQty: z.coerce.number().int().min(0).optional(),
    status: z.enum(assetStatusValues).optional(),
  })
  .transform((input) => ({
    ...input,
    category: input.category && input.category.length > 0 ? input.category : null,
    description: input.description && input.description.length > 0 ? input.description : null,
    location: input.location && input.location.length > 0 ? input.location : null,
  }));

export const assetUpdateSchema = z
  .object({
    assetCode: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(1).max(255).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    location: z.string().trim().max(2000).nullable().optional(),
    totalQty: z.coerce.number().int().min(0).optional(),
    availableQty: z.coerce.number().int().min(0).optional(),
    status: z.enum(assetStatusValues).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  });

export const assetIdParamsSchema = z.object({
  id: positiveIntegerIdSchema,
});

export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
