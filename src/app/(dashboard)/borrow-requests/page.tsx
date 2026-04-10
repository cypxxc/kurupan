"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";

import { BorrowRequestStatusTabs } from "@/components/shared/borrow-request-status-tabs";
import { BorrowRequestDataTable } from "@/components/tables/borrow-request-data-table";
import { buttonVariants } from "@/components/ui/button";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { PaginatedResult } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type {
  BorrowRequest,
  BorrowRequestStatus,
} from "@/types/borrow-requests";
import { BORROW_REQUEST_STATUS_VALUES } from "@/types/borrow-requests";

const PAGE_SIZE = 10;

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

export default function BorrowRequestsPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<BorrowRequest>>({
    items: [],
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | BorrowRequestStatus>(() =>
    getStatusFilterFromSearchParams(searchParams),
  );
  const [page, setPage] = useState(() => getPageFromSearchParams(searchParams));

  const isBorrower = user?.role === "borrower";
  const returnTo = useMemo(() => {
    const query = searchParams.toString();

    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const scrollStorageKey = `borrow-requests:scroll:${returnTo}`;

  useEffect(() => {
    const nextStatusFilter = getStatusFilterFromSearchParams(searchParams);
    const nextPage = getPageFromSearchParams(searchParams);

    setStatusFilter((currentStatusFilter) =>
      currentStatusFilter === nextStatusFilter ? currentStatusFilter : nextStatusFilter,
    );
    setPage((currentPage) => (currentPage === nextPage ? currentPage : nextPage));
  }, [searchParams]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const data = await apiClient.get<PaginatedResult<BorrowRequest>>("/api/borrow-requests", {
        query: params,
      });

      setRequests(data.items);
      setPagination(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "เกิดข้อผิดพลาดระหว่างโหลดคำขอยืม"));
      setRequests([]);
      setPagination((current) => ({
        ...current,
        items: [],
        page,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      }));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

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
    if (loading) {
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
  }, [loading, scrollStorageKey]);

  const handleStatusFilterChange = useCallback(
    (nextStatusFilter: "all" | BorrowRequestStatus) => {
      setStatusFilter(nextStatusFilter);
      setPage(1);

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

      router.replace(nextHref, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);

      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (nextPage <= 1) {
        nextSearchParams.delete("page");
      } else {
        nextSearchParams.set("page", String(nextPage));
      }

      const nextHref = nextSearchParams.toString()
        ? `${pathname}?${nextSearchParams.toString()}`
        : pathname;

      router.replace(nextHref, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">คำขอยืม</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">คำขอยืม</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {isBorrower
                ? "ติดตามคำขอยืมของคุณ ตรวจสอบสถานะ และเปิดดูรายละเอียดแต่ละคำขอ"
                : "ดูคำขอยืมทั้งหมด ตรวจสอบรายการที่รออนุมัติ และเปิดดูรายละเอียดเพื่อดำเนินการ"}
            </p>
          </div>
        </div>
        <Link
          href="/borrow-requests/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Plus className="size-4" />
          สร้างคำขอยืม
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">
            {isBorrower ? "คำขอในหน้านี้" : "คำขอในหน้านี้"}
          </p>
          <p className="mt-2 text-3xl font-semibold">{requests.length}</p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">รออนุมัติในหน้านี้</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">กำลังยืมในหน้านี้</p>
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
        key={statusFilter}
        requests={requests}
        loading={loading}
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
