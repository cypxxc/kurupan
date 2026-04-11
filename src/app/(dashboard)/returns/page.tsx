import { redirect } from "next/navigation";

import { ReturnsPageClient } from "@/components/pages/returns-page-client";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createReturnStack } from "@/modules/returns/createReturnStack";
import type { ReturnTransaction } from "@/types/returns";
import type { PaginatedResult } from "@/lib/pagination";

const PAGE_SIZE = 10;

type ReturnsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parsePage(rawPage: string | string[] | undefined) {
  const page = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page = parsePage(resolvedSearchParams.page);
  const { returnService } = createReturnStack();
  const rawPage = await returnService.listReturnsPage(actor, { page, limit: PAGE_SIZE });

  const initialPage: PaginatedResult<ReturnTransaction> = {
    ...rawPage,
    items: rawPage.items.map((record) => ({
      id: record.id,
      borrowRequestId: record.borrowRequestId,
      receivedByExternalUserId: record.receivedByExternalUserId,
      borrowerExternalUserId: record.borrowerExternalUserId,
      borrowerName: record.borrowerName,
      note: record.note,
      returnedAt: record.returnedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
      borrowRequestNo: record.borrowRequestNo,
      items: record.items,
    })),
  };

  return <ReturnsPageClient initialPage={initialPage} />;
}
