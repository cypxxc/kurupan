import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { broadcast } from "@/lib/sse/notification-subscribers";
import type { ActorContext } from "@/types/auth";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import type { BorrowRequestDetail } from "@/modules/borrow/repositories/BorrowRequestRepository";
import type { ReturnTransactionDetail } from "@/modules/returns/repositories/ReturnRepository";

import {
  NotificationRepository,
  type NotificationEntityType,
  type NotificationRecord,
  type NotificationType,
} from "../repositories/NotificationRepository";

type NotificationRecipientInput = {
  recipientExternalUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
};

type NotificationTemplate = Omit<NotificationRecipientInput, "recipientExternalUserId">;

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userAccessRepository: UserAccessRepository,
  ) {}

  async getNotifications(actor: ActorContext, limit = 30) {
    return this.notificationRepository.findMany(actor.externalUserId, limit);
  }

  async getUnreadCount(actor: ActorContext) {
    return this.notificationRepository.countUnread(actor.externalUserId);
  }

  async markRead(actor: ActorContext, id: number) {
    const notification = await this.notificationRepository.markRead(id, actor.externalUserId);

    if (!notification) {
      throw new NotFoundError("Notification not found", { notificationId: id });
    }

    await this.broadcastUnreadCount(actor.externalUserId);

    return notification;
  }

  async markAllRead(actor: ActorContext) {
    const markedCount = await this.notificationRepository.markAllRead(actor.externalUserId);

    await this.broadcastUnreadCount(actor.externalUserId);

    return { markedCount };
  }

  async notifyBorrowRequestCreated(request: BorrowRequestDetail) {
    const recipients = await this.getStaffAndAdminIds();

    await this.notifyMany(recipients, {
      type: "borrow_request_created",
      title: "New borrow request",
      body: `${request.borrowerName} submitted request ${request.requestNo}.`,
      entityType: "borrow_request",
      entityId: String(request.id),
    });
  }

  async notifyBorrowRequestApproved(request: BorrowRequestDetail) {
    await this.notifyMany([request.borrowerExternalUserId], {
      type: "borrow_request_approved",
      title: "Borrow request approved",
      body: `Your request ${request.requestNo} has been approved.`,
      entityType: "borrow_request",
      entityId: String(request.id),
    });
  }

  async notifyBorrowRequestRejected(request: BorrowRequestDetail) {
    await this.notifyMany([request.borrowerExternalUserId], {
      type: "borrow_request_rejected",
      title: "Borrow request rejected",
      body: `Your request ${request.requestNo} has been rejected.`,
      entityType: "borrow_request",
      entityId: String(request.id),
    });
  }

  async notifyBorrowRequestCancelled(request: BorrowRequestDetail) {
    const recipients = await this.getStaffAndAdminIds();

    await this.notifyMany(recipients, {
      type: "borrow_request_cancelled",
      title: "Borrow request cancelled",
      body: `${request.borrowerName} cancelled request ${request.requestNo}.`,
      entityType: "borrow_request",
      entityId: String(request.id),
    });
  }

  async notifyReturnRecorded(record: ReturnTransactionDetail) {
    await this.notifyMany([record.borrowerExternalUserId], {
      type: "return_recorded",
      title: "Return recorded",
      body: `A return was recorded for request ${record.borrowRequestNo}.`,
      entityType: "return_transaction",
      entityId: String(record.id),
    });
  }

  async notifyDueDateApproaching(request: BorrowRequestDetail) {
    await this.notifyMany([request.borrowerExternalUserId], {
      type: "due_date_approaching",
      title: "Due date is tomorrow",
      body: `Request ${request.requestNo} is due on ${request.dueDate}.`,
      entityType: "borrow_request",
      entityId: String(request.id),
    });
  }

  async notifyOverdue(request: BorrowRequestDetail) {
    const staffAndAdminIds = await this.getStaffAndAdminIds();

    await Promise.all([
      this.notifyMany([request.borrowerExternalUserId], {
        type: "overdue",
        title: "Borrow request overdue",
        body: `Request ${request.requestNo} is overdue since ${request.dueDate}.`,
        entityType: "borrow_request",
        entityId: String(request.id),
      }),
      this.notifyMany(staffAndAdminIds, {
        type: "overdue",
        title: "Overdue borrow request",
        body: `${request.borrowerName}'s request ${request.requestNo} is overdue since ${request.dueDate}.`,
        entityType: "borrow_request",
        entityId: String(request.id),
      }),
    ]);
  }

  private async notifyMany(recipientExternalUserIds: string[], notification: NotificationTemplate) {
    const recipients = Array.from(new Set(recipientExternalUserIds.filter(Boolean)));

    if (recipients.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      recipients.map((recipientExternalUserId) =>
        this.createAndBroadcast({
          ...notification,
          recipientExternalUserId,
        }),
      ),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        continue;
      }

      logger.error("Failed to deliver notification", {
        error: result.reason,
        recipientExternalUserId: recipients[index],
        type: notification.type,
      });
    }
  }

  private async createAndBroadcast(
    input: NotificationRecipientInput,
  ): Promise<NotificationRecord> {
    const notification = await this.notificationRepository.create(input);
    const unreadCount = await this.notificationRepository.countUnread(
      input.recipientExternalUserId,
    );

    broadcast(input.recipientExternalUserId, {
      type: "new_notification",
      notification,
    });
    broadcast(input.recipientExternalUserId, {
      type: "unread_count",
      count: unreadCount,
    });

    return notification;
  }

  private async broadcastUnreadCount(recipientExternalUserId: string) {
    const count = await this.notificationRepository.countUnread(recipientExternalUserId);

    broadcast(recipientExternalUserId, {
      type: "unread_count",
      count,
    });
  }

  private async getStaffAndAdminIds(): Promise<string[]> {
    const rows = await this.userAccessRepository.findMany({ isActive: true });

    return rows
      .filter((row) => row.role === "staff" || row.role === "admin")
      .map((row) => row.externalUserId);
  }
}
