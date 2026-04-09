import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";

export const GET = withErrorHandler(async (request: Request) => {
  const actor = await requireCurrentActor(request);
  const { notificationService } = createNotificationStack();
  const count = await notificationService.getUnreadCount(actor);

  return successResponse({ count });
});
