import { redirect } from "next/navigation";

import { BorrowRequestsPageClient } from "@/components/pages/borrow-requests-page-client";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createBorrowStack } from "@/modules/borrow/createBorrowStack";
import type { BorrowRequest, BorrowRequestStatus } from "@/types/borrow-requests";
import { BORROW_REQUEST_STATUS_VALUES } from "@/types/borrow-requests";

const PAGE_SIZE = 10;

type BorrowRequestsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatusFilter(rawStatus: string | undefined) {
  if (rawStatus && BORROW_REQUEST_STATUS_VALUES.includes(rawStatus as BorrowRequestStatus)) {
    return rawStatus as BorrowRequestStatus;
  }

  return undefined;
}

function parsePage(rawPage: string | undefined) {
  const page = Number(rawPage);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

function serializeBorrowRequest(request: {
  id: number;
  requestNo: string;
  borrowerExternalUserId: string;
  borrowerName: string;
  purpose: string | null;
  startDate: string;
  dueDate: string;
  status: BorrowRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  items: BorrowRequest["items"];
}): BorrowRequest {
  return {
    id: request.id,
    requestNo: request.requestNo,
    borrowerExternalUserId: request.borrowerExternalUserId,
    borrowerName: request.borrowerName,
    purpose: request.purpose,
    startDate: request.startDate,
    dueDate: request.dueDate,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    items: request.items,
  };
}

export default async function BorrowRequestsPage({
  searchParams,
}: BorrowRequestsPageProps) {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const status = parseStatusFilter(takeFirst(resolvedSearchParams.status));
  const page = parsePage(takeFirst(resolvedSearchParams.page));
  const { borrowRequestService } = createBorrowStack();
  const initialPage = await borrowRequestService.listBorrowRequestPage(actor, {
    status,
    page,
    limit: PAGE_SIZE,
  });
  const serializedPage = {
    ...initialPage,
    items: initialPage.items.map(serializeBorrowRequest),
  };

  return <BorrowRequestsPageClient initialPage={serializedPage} />;
}
