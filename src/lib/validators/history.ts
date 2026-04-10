import { z } from "zod";

import { dateStringSchema } from "./http";

export const historyEntityTypeValues = [
  "asset",
  "borrow_request",
  "return_transaction",
  "user",
] as const;

export const historyListQuerySchema = z
  .object({
    entityType: z.enum(historyEntityTypeValues).optional(),
    entityId: z.string().trim().min(1).max(255).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    dateFrom: dateStringSchema.optional(),
    dateTo: dateStringSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine(
    (input) => !input.dateFrom || !input.dateTo || input.dateFrom <= input.dateTo,
    {
      message: "dateFrom must be earlier than or equal to dateTo",
      path: ["dateFrom"],
    },
  );

export const auditLogListQuerySchema = historyListQuerySchema;

export type HistoryListQuery = z.infer<typeof historyListQuerySchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
