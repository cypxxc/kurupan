import { z } from "zod";

import { dateStringSchema, positiveIntegerIdSchema } from "./http";

const borrowRequestStatusValues = [
  "pending",
  "approved",
  "partially_approved",
  "rejected",
  "cancelled",
  "partially_returned",
  "returned",
] as const;

const borrowRequestItemSchema = z.object({
  assetId: positiveIntegerIdSchema,
  requestedQty: z.coerce.number().int().positive(),
});

export const borrowRequestListQuerySchema = z.object({
  status: z.enum(borrowRequestStatusValues).optional(),
  borrower: z.string().trim().min(1).max(255).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const borrowRequestCreateSchema = z
  .object({
    purpose: z.string().trim().min(1).max(2000),
    startDate: dateStringSchema,
    dueDate: dateStringSchema,
    items: z.array(borrowRequestItemSchema).min(1),
  })
  .refine((input) => input.dueDate >= input.startDate, {
    message: "Due date must be on or after start date",
    path: ["dueDate"],
  })
  .refine(
    (input) => new Set(input.items.map((item) => item.assetId)).size === input.items.length,
    {
      message: "Each asset can only appear once in a request",
      path: ["items"],
    },
  );

export const borrowRequestIdParamsSchema = z.object({
  id: positiveIntegerIdSchema,
});

const approveItemSchema = z.object({
  borrowRequestItemId: positiveIntegerIdSchema,
  approvedQty: z.coerce.number().int().min(0),
});

export const borrowRequestApproveSchema = z
  .object({
    items: z.array(approveItemSchema).min(1).optional(),
  })
  .refine(
    (input) =>
      !input.items ||
      new Set(input.items.map((item) => item.borrowRequestItemId)).size === input.items.length,
    {
      message: "Each request item can only be approved once per request",
      path: ["items"],
    },
  );

export type BorrowRequestListQuery = z.infer<typeof borrowRequestListQuerySchema>;
export type BorrowRequestCreateInput = z.infer<typeof borrowRequestCreateSchema>;
export type BorrowRequestApproveInput = z.infer<typeof borrowRequestApproveSchema>;
