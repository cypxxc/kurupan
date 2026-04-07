"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  History,
  Package,
  Plus,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";

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
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";
import {
  isBorrowRequestOverdue,
  type BorrowRequest,
} from "@/types/borrow-requests";
import type { ManagedUser } from "@/types/users";

type DashboardData = {
  requests: BorrowRequest[];
  assets: Asset[];
  users: ManagedUser[];
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "sky" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "sky"
      ? "text-sky-600 dark:text-sky-400"
      : tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : "";

  return (
    <div className="rounded-3xl border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold", toneClass)}>{value}</p>
    </div>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="group rounded-3xl border bg-card px-5 py-5 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">{action.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function RequestTable({
  title,
  description,
  requests,
  emptyLabel,
}: {
  title: string;
  description: string;
  requests: BorrowRequest[];
  emptyLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่คำขอ</TableHead>
              <TableHead>ผู้ยืม</TableHead>
              <TableHead>กำหนดคืน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">เปิดดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const overdue = isBorrowRequestOverdue(request.status, request.dueDate);

                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{request.requestNo}</p>
                        {overdue ? <OverdueBadge className="w-fit" /> : null}
                      </div>
                    </TableCell>
                    <TableCell>{request.borrowerName}</TableCell>
                    <TableCell>{formatDate(request.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge type="borrow" value={request.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link
                          href={`/borrow-requests/${request.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          ดูรายละเอียด
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function AssetStatsPanel({ assets }: { assets: Asset[] }) {
  const availableAssets = assets.filter((asset) => asset.status === "available").length;
  const maintenanceAssets = assets.filter((asset) => asset.status === "maintenance").length;
  const retiredAssets = assets.filter((asset) => asset.status === "retired").length;
  const borrowableAssets = assets.filter(
    (asset) => asset.status === "available" && asset.availableQty > 0,
  ).length;

  return (
    <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
      <h2 className="text-lg font-semibold">สถิติครุภัณฑ์</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        ภาพรวมสถานะครุภัณฑ์ในระบบสำหรับเจ้าหน้าที่
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard label="ครุภัณฑ์ทั้งหมด" value={assets.length} />
        <MetricCard label="พร้อมยืมได้" value={borrowableAssets} tone="emerald" />
        <MetricCard label="พร้อมใช้งาน" value={availableAssets} tone="sky" />
        <MetricCard label="ซ่อมบำรุง" value={maintenanceAssets} tone="amber" />
      </div>
      {retiredAssets > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          ปลดระวางแล้ว {retiredAssets} รายการ
        </p>
      ) : null}
    </section>
  );
}

function UserStatsPanel({ users }: { users: ManagedUser[] }) {
  const activeUsers = users.filter((item) => item.isActive).length;
  const inactiveUsers = users.filter((item) => !item.isActive).length;
  const adminUsers = users.filter((item) => item.role === "admin").length;
  const staffUsers = users.filter((item) => item.role === "staff").length;

  return (
    <section className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
      <h2 className="text-lg font-semibold">สถิติผู้ใช้</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        ข้อมูลภาพรวมสำหรับผู้ดูแลระบบ
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard label="ผู้ใช้ทั้งหมด" value={users.length} />
        <MetricCard label="ผู้ใช้ที่ active" value={activeUsers} tone="emerald" />
        <MetricCard label="Staff" value={staffUsers} tone="sky" />
        <MetricCard label="Admin" value={adminUsers} tone="amber" />
      </div>
      {inactiveUsers > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          ผู้ใช้ inactive {inactiveUsers} รายการ
        </p>
      ) : null}
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    requests: [],
    assets: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);

  const isBorrower = user?.role === "borrower";
  const isAdmin = user?.role === "admin";
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  const fetchDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const requestsPromise = fetch("/api/borrow-requests").then((response) =>
        response.json(),
      ) as Promise<
        | { success: true; data: BorrowRequest[] }
        | { success: false; error?: { message?: string } }
      >;

      const assetsPromise = isStaffOrAdmin
        ? (fetch("/api/assets").then((response) => response.json()) as Promise<
            | { success: true; data: Asset[] }
            | { success: false; error?: { message?: string } }
          >)
        : Promise.resolve({ success: true as const, data: [] as Asset[] });

      const usersPromise = isAdmin
        ? (fetch("/api/users").then((response) => response.json()) as Promise<
            | { success: true; data: ManagedUser[] }
            | { success: false; error?: { message?: string } }
          >)
        : Promise.resolve({ success: true as const, data: [] as ManagedUser[] });

      const [requestsResult, assetsResult, usersResult] = await Promise.all([
        requestsPromise,
        assetsPromise,
        usersPromise,
      ]);

      if (!requestsResult.success) {
        throw new Error(requestsResult.error?.message ?? "ไม่สามารถโหลดคำขอยืมได้");
      }

      if (!assetsResult.success) {
        throw new Error(assetsResult.error?.message ?? "ไม่สามารถโหลดครุภัณฑ์ได้");
      }

      if (!usersResult.success) {
        throw new Error(usersResult.error?.message ?? "ไม่สามารถโหลดผู้ใช้ได้");
      }

      setData({
        requests: requestsResult.data,
        assets: assetsResult.data,
        users: usersResult.data,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "โหลด dashboard ไม่สำเร็จ");
      setData({
        requests: [],
        assets: [],
        users: [],
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isStaffOrAdmin, user]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const myActiveBorrows = useMemo(
    () =>
      data.requests.filter(
        (request) =>
          request.status === "approved" || request.status === "partially_returned",
      ),
    [data.requests],
  );

  const recentMyRequests = useMemo(() => data.requests.slice(0, 5), [data.requests]);

  const pendingRequests = useMemo(
    () => data.requests.filter((request) => request.status === "pending"),
    [data.requests],
  );

  const activeBorrows = useMemo(
    () =>
      data.requests.filter(
        (request) =>
          request.status === "approved" || request.status === "partially_returned",
      ),
    [data.requests],
  );

  const latestRequestStatus = useMemo<string>(() => {
    return data.requests[0]?.status ?? "-";
  }, [data.requests]);

  const quickActions = useMemo<QuickAction[]>(() => {
    if (isBorrower) {
      return [
        {
          title: "เลือกยืมสิ่งของ",
          description: "ค้นหาและเลือกครุภัณฑ์ที่พร้อมยืมจากรายการทั้งหมด",
          href: "/assets",
          icon: Package,
        },
        {
          title: "ดูคำขอของฉัน",
          description: "ติดตามสถานะคำขอยืมและกำหนดคืน",
          href: "/borrow-requests",
          icon: ClipboardList,
        },
        {
          title: "ดูประวัติของฉัน",
          description: "ตรวจสอบประวัติการยืมและการคืนย้อนหลัง",
          href: "/history",
          icon: History,
        },
      ];
    }

    const actions: QuickAction[] = [
      {
        title: "เพิ่มครุภัณฑ์",
        description: "สร้างรายการครุภัณฑ์ใหม่ในระบบ",
        href: "/assets/new",
        icon: Plus,
      },
      {
        title: "ดูคำขอ",
        description: "เปิดรายการคำขอยืมเพื่ออนุมัติหรือปฏิเสธ",
        href: "/borrow-requests",
        icon: ClipboardCheck,
      },
      {
        title: "บันทึกการคืน",
        description: "รับคืนครุภัณฑ์และอัปเดตสถานะคำขอ",
        href: "/returns/new",
        icon: RotateCcw,
      },
      {
        title: "ดูประวัติ",
        description: "ตรวจสอบประวัติและ audit trail ของระบบ",
        href: "/history",
        icon: History,
      },
    ];

    if (isAdmin) {
      actions.push({
        title: "จัดการสิทธิ์ผู้ใช้",
        description: "กำหนด role และควบคุมสิทธิ์การเข้าใช้งาน",
        href: "/users",
        icon: Users,
      });
    }

    return actions;
  }, [isAdmin, isBorrower]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl border bg-muted/60" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-[320px] animate-pulse rounded-3xl border bg-muted/60" />
          <div className="h-[320px] animate-pulse rounded-3xl border bg-muted/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">ภาพรวมการใช้งาน</h1>
      </div>

      {isBorrower ? (
        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="จำนวนคำขอของฉัน" value={data.requests.length} />
          <MetricCard
            label="รายการที่กำลังยืมอยู่"
            value={myActiveBorrows.length}
            tone="sky"
          />
          <MetricCard
            label="สถานะคำขอล่าสุด"
            value={latestRequestStatus === "-" ? "-" : latestRequestStatus}
            tone="amber"
          />
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="ครุภัณฑ์ทั้งหมด" value={data.assets.length} />
          <MetricCard
            label="คำขอ pending"
            value={pendingRequests.length}
            tone="amber"
          />
          <MetricCard
            label="รายการที่กำลังยืม"
            value={activeBorrows.length}
            tone="sky"
          />
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ทางลัดสำหรับงานที่ใช้บ่อยตามสิทธิ์ของผู้ใช้
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>
      </section>

      {isBorrower ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <RequestTable
            title="คำขอล่าสุดของฉัน"
            description="ติดตามคำขอยืมล่าสุดและสถานะของแต่ละคำขอ"
            requests={recentMyRequests}
            emptyLabel="ยังไม่มีคำขอยืมในระบบ"
          />
          <RequestTable
            title="รายการที่กำลังยืมอยู่"
            description="คำขอที่ได้รับอนุมัติแล้วและยังไม่คืนครบ"
            requests={myActiveBorrows}
            emptyLabel="ยังไม่มีรายการที่กำลังยืมอยู่"
          />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <RequestTable
            title="งานที่ต้องจัดการ"
            description="คำขอ pending ที่รอการพิจารณาจากเจ้าหน้าที่"
            requests={pendingRequests.slice(0, 5)}
            emptyLabel="ไม่มีคำขอที่รอดำเนินการ"
          />
          <AssetStatsPanel assets={data.assets} />
        </div>
      )}

      {isStaffOrAdmin ? (
        <RequestTable
          title="รายการที่กำลังยืม"
          description="คำขอที่อนุมัติแล้วหรืออยู่ระหว่างคืนบางส่วน"
          requests={activeBorrows.slice(0, 8)}
          emptyLabel="ไม่มีรายการที่กำลังยืมอยู่"
        />
      ) : null}

      {isAdmin ? <UserStatsPanel users={data.users} /> : null}
    </div>
  );
}
