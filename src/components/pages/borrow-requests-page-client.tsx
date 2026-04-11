"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";

import { BorrowRequestStatusTabs } from "@/components/shared/borrow-request-status-tabs";
import { BorrowRequestDataTable } from "@/components/tables/borrow-request-data-table";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { PaginatedResult } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type {
  BorrowRequest,
  BorrowRequestStatus,
} from "@/types/borrow-requests";
import { BORROW_REQUEST_STATUS_VALUES } from "@/types/borrow-requests";

function getStatusFilterFromSearchParams(searchParams: ReadonlyURLSearchParams) {
  const status = searchParams.get("status");

  if (
    status &&
    BORROW_REQUEST_STATUS_VALUES.includes(status as BorrowRequestStatus)
  ) {
    return status as BorrowRequestStatus;
  }

  return "all";
}

function getPageFromSearchParams(searchParams: ReadonlyURLSearchParams) {
  const page = Number(searchParams.get("page"));

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export function BorrowRequestsPageClient({
  initialPage,
}: {
  initialPage: PaginatedResult<BorrowRequest>;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isBorrower = user?.role === "borrower";
  const requests = initialPage.items;
  const pagination = initialPage;
  const statusFilter = getStatusFilterFromSearchParams(searchParams);
  const returnTo = useMemo(() => {
    const query = searchParams.toString();

    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const scrollStorageKey = `borrow-requests:scroll:${returnTo}`;

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests],
  );
  const activeCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "approved" ||
          request.status === "partially_approved" ||
          request.status === "partially_returned",
      ).length,
    [requests],
  );

  useEffect(() => {
    if (isPending) {
      return;
    }

    const savedScrollY = window.sessionStorage.getItem(scrollStorageKey);

    if (!savedScrollY) {
      return;
    }

    window.sessionStorage.removeItem(scrollStorageKey);

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Number(savedScrollY), behavior: "auto" });
    });
  }, [isPending, scrollStorageKey]);

  const handleStatusFilterChange = useCallback(
    (nextStatusFilter: "all" | BorrowRequestStatus) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (nextStatusFilter === "all") {
        nextSearchParams.delete("status");
      } else {
        nextSearchParams.set("status", nextStatusFilter);
      }

      nextSearchParams.delete("page");

      const nextHref = nextSearchParams.toString()
        ? `${pathname}?${nextSearchParams.toString()}`
        : pathname;

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (nextPage <= 1) {
        nextSearchParams.delete("page");
      } else {
        nextSearchParams.set("page", String(nextPage));
      }

      const nextHref = nextSearchParams.toString()
        ? `${pathname}?${nextSearchParams.toString()}`
        : pathname;

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">คําขอยืม</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">คําขอยืม</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isBorrower
                ? "ติดตามคําขอยืมของคุณ ตรวจสอบสถานะ และเปิดดูรายละเอียดแต่ละรายการได้จากหน้านี้"
                : "ดูคําขอยืมทั้งหมด ตรวจสอบรายการที่รออนุมัติ และเปิดดูรายละเอียดเพื่อดำเนินการต่อได้จากหน้านี้"}
            </p>
          </div>
        </div>
        <Link
          href="/borrow-requests/new"
          prefetch={false}
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Plus className="size-4" />
          สร้างคําขอยืม
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">คําขอในหน้านี้</p>
          <p className="mt-2 text-3xl font-semibold">{requests.length}</p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">รออนุมัติในหน้านี้</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">กําลังยืมในหน้านี้</p>
          <p className="mt-2 text-3xl font-semibold text-sky-600 dark:text-sky-400">
            {activeCount}
          </p>
        </div>
      </div>

      <section className="filter-shell">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardList className="size-4" />
          กรองตามสถานะ
        </div>
        <div className="mt-4">
          <BorrowRequestStatusTabs
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
          />
        </div>
      </section>

      <BorrowRequestDataTable
        key={`${statusFilter}:${getPageFromSearchParams(searchParams)}`}
        requests={requests}
        loading={isPending}
        isBorrower={Boolean(isBorrower)}
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        returnTo={returnTo}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
