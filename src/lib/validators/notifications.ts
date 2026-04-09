import { z } from "zod";

import { positiveIntegerIdSchema } from "./http";

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const notificationIdParamsSchema = z.object({
  id: positiveIntegerIdSchema,
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
