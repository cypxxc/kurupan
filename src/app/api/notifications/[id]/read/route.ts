import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { getRequestLocale } from "@/lib/i18n/server";
import { parseRouteParams } from "@/lib/validators/http";
import { notificationIdParamsSchema } from "@/lib/validators/notifications";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";
import { NotificationPresenter } from "@/modules/notifications/notification-presenter";

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
  ) => {
    const actor = await requireCurrentActor(request);
    const { id } = await parseRouteParams(context.params, notificationIdParamsSchema);
    const { notificationService } = createNotificationStack();
    const [locale, notification] = await Promise.all([
      getRequestLocale(),
      notificationService.markRead(actor, id),
    ]);
    const presenter = new NotificationPresenter();
    const localizedNotification = await presenter.presentOne(notification, locale);

    return successResponse(localizedNotification);
  },
);
