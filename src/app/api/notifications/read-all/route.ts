import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";

export const PATCH = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const { notificationService } = createNotificationStack();
  const result = await notificationService.markAllRead(actor);

  return successResponse(result);
});
