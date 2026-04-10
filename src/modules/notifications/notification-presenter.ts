import type { Locale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/shared";
import { BorrowRequestRepository, type BorrowRequestDetail } from "@/modules/borrow/repositories/BorrowRequestRepository";
import { ReturnRepository, type ReturnTransactionDetail } from "@/modules/returns/repositories/ReturnRepository";
import type { NotificationItem } from "@/types/notifications";

import type { NotificationRecord } from "./repositories/NotificationRepository";

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

function formatCalendarDate(value: string, locale: Locale) {
  const intlLocale = locale === "en" ? "en-US" : "th-TH";

  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function buildTranslator(locale: Locale): TranslationFn {
  const dictionary = dictionaries[locale];

  return (key, values) => translate(dictionary, key, values);
}

function toNotificationItem(
  record: NotificationRecord,
  title: string,
  body: string,
): NotificationItem {
  const entityType =
    record.entityType === "borrow_request" || record.entityType === "return_transaction"
      ? record.entityType
      : null;

  return {
    id: record.id,
    recipientExternalUserId: record.recipientExternalUserId,
    type: record.type,
    title,
    body,
    entityType,
    entityId: record.entityId,
    isRead: record.isRead,
    readAt: record.readAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function presentBorrowRequestNotification(
  record: NotificationRecord,
  request: BorrowRequestDetail,
  locale: Locale,
  t: TranslationFn,
) {
  const dueDate = formatCalendarDate(request.dueDate, locale);

  switch (record.type) {
    case "borrow_request_created":
      return toNotificationItem(
        record,
        t("notifications.messages.borrowRequestCreated.title"),
        t("notifications.messages.borrowRequestCreated.body", {
          borrowerName: request.borrowerName,
          requestNo: request.requestNo,
        }),
      );
    case "borrow_request_approved":
      if (request.status === "partially_approved") {
        return toNotificationItem(
          record,
          t("notifications.messages.borrowRequestPartiallyApproved.title"),
          t("notifications.messages.borrowRequestPartiallyApproved.body", {
            requestNo: request.requestNo,
          }),
        );
      }

      return toNotificationItem(
        record,
        t("notifications.messages.borrowRequestApproved.title"),
        t("notifications.messages.borrowRequestApproved.body", {
          requestNo: request.requestNo,
        }),
      );
    case "borrow_request_rejected":
      return toNotificationItem(
        record,
        t("notifications.messages.borrowRequestRejected.title"),
        t("notifications.messages.borrowRequestRejected.body", {
          requestNo: request.requestNo,
        }),
      );
    case "borrow_request_cancelled":
      return toNotificationItem(
        record,
        t("notifications.messages.borrowRequestCancelled.title"),
        t("notifications.messages.borrowRequestCancelled.body", {
          borrowerName: request.borrowerName,
          requestNo: request.requestNo,
        }),
      );
    case "due_date_approaching":
      return toNotificationItem(
        record,
        t("notifications.messages.dueDateApproaching.title"),
        t("notifications.messages.dueDateApproaching.body", {
          requestNo: request.requestNo,
          dueDate,
        }),
      );
    case "overdue":
      if (record.recipientExternalUserId === request.borrowerExternalUserId) {
        return toNotificationItem(
          record,
          t("notifications.messages.overdueBorrower.title"),
          t("notifications.messages.overdueBorrower.body", {
            requestNo: request.requestNo,
            dueDate,
          }),
        );
      }

      return toNotificationItem(
        record,
        t("notifications.messages.overdueStaff.title"),
        t("notifications.messages.overdueStaff.body", {
          borrowerName: request.borrowerName,
          requestNo: request.requestNo,
          dueDate,
        }),
      );
    default:
      return null;
  }
}

function presentReturnNotification(
  record: NotificationRecord,
  returnRecord: ReturnTransactionDetail,
  t: TranslationFn,
) {
  if (record.type !== "return_recorded") {
    return null;
  }

  return toNotificationItem(
    record,
    t("notifications.messages.returnRecorded.title"),
    t("notifications.messages.returnRecorded.body", {
      requestNo: returnRecord.borrowRequestNo,
    }),
  );
}

export class NotificationPresenter {
  constructor(
    private readonly borrowRequestRepository = new BorrowRequestRepository(),
    private readonly returnRepository = new ReturnRepository(),
  ) {}

  async presentMany(
    records: NotificationRecord[],
    locale: Locale,
  ): Promise<NotificationItem[]> {
    if (records.length === 0) {
      return [];
    }

    const borrowRequestIds = records
      .filter(
        (record): record is NotificationRecord & {
          entityType: "borrow_request";
          entityId: string;
        } => record.entityType === "borrow_request" && Boolean(record.entityId),
      )
      .map((record) => Number(record.entityId))
      .filter((id) => Number.isInteger(id) && id > 0);
    const returnIds = records
      .filter(
        (record): record is NotificationRecord & {
          entityType: "return_transaction";
          entityId: string;
        } => record.entityType === "return_transaction" && Boolean(record.entityId),
      )
      .map((record) => Number(record.entityId))
      .filter((id) => Number.isInteger(id) && id > 0);

    const [borrowRequests, returnTransactions] = await Promise.all([
      this.borrowRequestRepository.findManyByIds(borrowRequestIds),
      this.returnRepository.findManyByIds(returnIds),
    ]);

    const borrowRequestMap = new Map(
      borrowRequests.map((request) => [String(request.id), request]),
    );
    const returnMap = new Map(
      returnTransactions.map((returnRecord) => [String(returnRecord.id), returnRecord]),
    );
    const t = buildTranslator(locale);

    return records.map((record) => {
      const borrowRequest =
        record.entityType === "borrow_request" && record.entityId
          ? borrowRequestMap.get(record.entityId)
          : null;

      if (borrowRequest) {
        const localized = presentBorrowRequestNotification(record, borrowRequest, locale, t);

        if (localized) {
          return localized;
        }
      }

      const returnRecord =
        record.entityType === "return_transaction" && record.entityId
          ? returnMap.get(record.entityId)
          : null;

      if (returnRecord) {
        const localized = presentReturnNotification(record, returnRecord, t);

        if (localized) {
          return localized;
        }
      }

      return toNotificationItem(record, record.title, record.body);
    });
  }

  async presentOne(
    record: NotificationRecord,
    locale: Locale,
  ): Promise<NotificationItem> {
    const [notification] = await this.presentMany([record], locale);
    return notification;
  }
}
