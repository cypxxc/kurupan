"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";

import { OverdueBadge } from "@/components/shared/overdue-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  compareBorrowRequestsForDisplay,
  isBorrowRequestOverdue,
  type BorrowRequest,
} from "@/types/borrow-requests";

const PAGE_SIZE = 10;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function BorrowRequestDataTable({
  requests,
  loading,
  isBorrower,
  page,
  returnTo,
  onPageChange,
}: {
  requests: BorrowRequest[];
  loading: boolean;
  isBorrower: boolean;
  page: number;
  returnTo: string;
  onPageChange: (page: number) => void;
}) {
  const orderedRequests = useMemo(
    () => [...requests].sort(compareBorrowRequestsForDisplay),
    [requests],
  );
  const pageCount = Math.max(1, Math.ceil(orderedRequests.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return orderedRequests.slice(start, start + PAGE_SIZE);
  }, [currentPage, orderedRequests]);

  const handleDetailNavigate = () => {
    window.sessionStorage.setItem(
      `borrow-requests:scroll:${returnTo}`,
      String(window.scrollY),
    );
  };

  if (loading) {
    return (
      <div className="table-shell">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่คำขอ</TableHead>
                {!isBorrower ? <TableHead>ผู้ยืม</TableHead> : null}
                <TableHead>วัตถุประสงค์</TableHead>
                <TableHead className="hidden md:table-cell">วันที่ยืม</TableHead>
                <TableHead className="hidden md:table-cell">กำหนดคืน</TableHead>
                <TableHead className="text-center">รายการ</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  {!isBorrower ? (
                    <TableCell>
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="ml-auto h-7 w-24 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (orderedRequests.length === 0) {
    return (
      <div className="empty-state">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ClipboardList className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">ไม่พบคำขอยืม</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          รายการจะปรากฏที่นี่เมื่อมีการส่งคำขอยืมเข้าสู่ระบบ
        </p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, orderedRequests.length);

  return (
    <div className="table-shell">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่คำขอ</TableHead>
              {!isBorrower ? <TableHead>ผู้ยืม</TableHead> : null}
              <TableHead>วัตถุประสงค์</TableHead>
              <TableHead className="hidden md:table-cell">วันที่ยืม</TableHead>
              <TableHead className="hidden md:table-cell">กำหนดคืน</TableHead>
              <TableHead className="text-center">รายการ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRequests.map((request) => {
              const overdue = isBorrowRequestOverdue(request.status, request.dueDate);

              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-muted-foreground">
                        {request.requestNo}
                      </p>
                      {overdue ? <OverdueBadge className="w-fit" /> : null}
                    </div>
                  </TableCell>
                  {!isBorrower ? (
                    <TableCell className="min-w-32">
                      <p className="font-medium">{request.borrowerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.borrowerExternalUserId}
                      </p>
                    </TableCell>
                  ) : null}
                  <TableCell className="min-w-56">
                    <p className="line-clamp-2 text-sm">{request.purpose ?? "-"}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(request.startDate)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(request.dueDate)}
                  </TableCell>
                  <TableCell className="text-center">{request.items.length}</TableCell>
                  <TableCell>
                    <StatusBadge type="borrow" value={request.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Link
                        href={`/borrow-requests/${request.id}?returnTo=${encodeURIComponent(returnTo)}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        onClick={handleDetailNavigate}
                      >
                        ดูรายละเอียด
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          แสดง {startItem}-{endItem} จาก {orderedRequests.length} รายการ
        </p>
        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1",
            )}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-3.5" />
            ก่อนหน้า
          </button>
          <span className="min-w-16 text-center text-muted-foreground">
            {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1",
            )}
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage === pageCount}
          >
            ถัดไป
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
