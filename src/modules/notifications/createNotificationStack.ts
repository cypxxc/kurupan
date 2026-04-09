import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";

import { NotificationRepository } from "./repositories/NotificationRepository";
import { NotificationService } from "./services/NotificationService";

export function createNotificationStack() {
  const notificationRepository = new NotificationRepository();
  const userAccessRepository = new UserAccessRepository();
  const notificationService = new NotificationService(
    notificationRepository,
    userAccessRepository,
  );

  return {
    notificationRepository,
    userAccessRepository,
    notificationService,
  };
}
