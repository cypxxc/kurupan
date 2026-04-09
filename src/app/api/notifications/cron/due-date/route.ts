import { AuthorizationError } from "@/lib/errors";
import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";
import { createNotificationStack } from "@/modules/notifications/createNotificationStack";

function requireCronSecret(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const receivedSecret = request.headers.get("x-cron-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    throw new AuthorizationError("Invalid cron secret");
  }
}

function formatBusinessDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export const GET = withErrorHandler(async (request: Request) => {
  requireCronSecret(request);

  const targetDate = formatBusinessDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const borrowRequestRepository = new BorrowRequestRepository();
  const { notificationService } = createNotificationStack();
  const requests = await borrowRequestRepository.findManyByDueDate(targetDate, [
    "approved",
    "partially_returned",
  ]);

  await Promise.allSettled(
    requests.map((borrowRequest) =>
      notificationService.notifyDueDateApproaching(borrowRequest),
    ),
  );

  return successResponse({
    targetDate,
    processedRequests: requests.length,
  });
});
