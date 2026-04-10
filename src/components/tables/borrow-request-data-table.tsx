"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { OverdueBadge } from "@/components/shared/overdue-badge";
import { PaginationControls } from "@/components/shared/pagination-controls";
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
import {
  isBorrowRequestOverdue,
  type BorrowRequest,
} from "@/types/borrow-requests";

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
  limit,
  total,
  totalPages,
  returnTo,
  onPageChange,
}: {
  requests: BorrowRequest[];
  loading: boolean;
  isBorrower: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  returnTo: string;
  onPageChange: (page: number) => void;
}) {
  const handleDetailNavigate = () => {
    window.sessionStorage.setItem(
      `borrow-requests:scroll:${returnTo}`,
      String(window.scrollY),
    );
  };

  const currentPage = Math.min(page, Math.max(1, totalPages));

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

  if (requests.length === 0) {
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

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

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
            {requests.map((request) => {
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
          แสดง {startItem}-{endItem} จาก {total} รายการ
        </p>
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          previousLabel="ก่อนหน้า"
          nextLabel="ถัดไป"
        />
      </div>
    </div>
  );
}
