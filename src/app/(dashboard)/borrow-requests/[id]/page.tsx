import { redirect } from "next/navigation";

import { BorrowRequestDetailPageClient } from "@/components/pages/borrow-request-detail/borrow-request-detail-page-client";
import { AuthenticationError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";
import { serializeBorrowRequestDetail } from "@/modules/borrow/serializers";
import { createHistoryStack } from "@/modules/history/createHistoryStack";

type BorrowRequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BorrowRequestDetailPage({
  params,
}: BorrowRequestDetailPageProps) {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId < 1) {
    return <BorrowRequestDetailPageClient initialRequest={null} initialTimeline={[]} />;
  }

  let initialRequest = null;
  let initialTimeline: Awaited<
    ReturnType<ReturnType<typeof createHistoryStack>["historyService"]["listHistory"]>
  > = [];

  try {
    const { borrowRequestService } = createBorrowStack();
    const { historyService } = createHistoryStack();
    const [request, timeline] = await Promise.all([
      borrowRequestService.getBorrowRequestById(actor, requestId),
      historyService.listHistory(actor, {
        entityType: "borrow_request",
        entityId: String(requestId),
      }),
    ]);

    initialRequest = serializeBorrowRequestDetail(request);
    initialTimeline = timeline;
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof AuthorizationError ||
      error instanceof AuthenticationError
    ) {
      return <BorrowRequestDetailPageClient initialRequest={null} initialTimeline={[]} />;
    }

    throw error;
  }

  return (
    <BorrowRequestDetailPageClient
      initialRequest={initialRequest}
      initialTimeline={initialTimeline}
    />
  );
}
