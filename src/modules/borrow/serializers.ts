import type { BorrowRequestDetail as RepositoryBorrowRequestDetail } from "@/modules/borrow/repositories/BorrowRequestRepository";
import type { BorrowRequestDetail } from "@/types/borrow-requests";

export function serializeBorrowRequestDetail(
  request: RepositoryBorrowRequestDetail,
): BorrowRequestDetail {
  return {
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    approvedAt: request.approvedAt?.toISOString() ?? null,
    rejectedAt: request.rejectedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
  };
}
