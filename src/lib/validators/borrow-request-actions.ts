import { z } from "zod";

export const borrowRequestRejectSchema = z.object({
  rejectionReason: z.string().trim().max(2000).optional(),
});

export const borrowRequestCancelSchema = z.object({
  cancelReason: z.string().trim().max(2000).optional(),
});

export type BorrowRequestRejectInput = z.infer<typeof borrowRequestRejectSchema>;
export type BorrowRequestCancelInput = z.infer<typeof borrowRequestCancelSchema>;
