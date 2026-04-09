import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { getRequestLocale } from "@/lib/i18n/server";
import { parseSearchParams } from "@/lib/validators/http";
import { notificationListQuerySchema } from "@/lib/validators/notifications";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";
import { NotificationPresenter } from "@/modules/notifications/notification-presenter";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const { limit } = parseSearchParams(request, notificationListQuerySchema);
  const { notificationService } = createNotificationStack();
  const [locale, notifications] = await Promise.all([
    getRequestLocale(),
    notificationService.getNotifications(actor, limit),
  ]);
  const presenter = new NotificationPresenter();
  const localizedNotifications = await presenter.presentMany(notifications, locale);

  return successResponse(localizedNotifications);
});
