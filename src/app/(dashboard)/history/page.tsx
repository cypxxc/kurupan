"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, History, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
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
import type { AuditLogEntry, HistoryEntityType, HistoryEvent } from "@/types/history";

type ViewMode = "history" | "audit";

const ENTITY_OPTIONS: Array<{ value: "all" | HistoryEntityType; label: string }> = [
  { value: "all", label: "ทุกประเภท" },
  { value: "borrow_request", label: "คำขอยืม" },
  { value: "return_transaction", label: "การคืน" },
  { value: "asset", label: "ครุภัณฑ์" },
  { value: "user", label: "ผู้ใช้" },
];

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "ทุกการกระทำ" },
  { value: "borrow_request.create", label: "สร้างคำขอยืม" },
  { value: "borrow_request.approve", label: "อนุมัติคำขอยืม" },
  { value: "borrow_request.reject", label: "ปฏิเสธคำขอยืม" },
  { value: "borrow_request.cancel", label: "ยกเลิกคำขอยืม" },
  { value: "return.create", label: "บันทึกการคืน" },
  { value: "return.update", label: "แก้ไขบันทึกการคืน" },
  { value: "asset.create", label: "สร้างครุภัณฑ์" },
  { value: "asset.update", label: "แก้ไขครุภัณฑ์" },
  { value: "user.create", label: "สร้างผู้ใช้" },
  { value: "user.update", label: "แก้ไขผู้ใช้" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getEntityLabel(entityType: HistoryEntityType) {
  return ENTITY_OPTIONS.find((option) => option.value === entityType)?.label ?? entityType;
}

function getActionLabel(action: string) {
  return ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border bg-card px-6 py-14 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <ClipboardList className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("history");
  const [entityType, setEntityType] = useState<"all" | HistoryEntityType>("all");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyItems, setHistoryItems] = useState<HistoryEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  const canManageAudit = user?.role === "staff" || user?.role === "admin";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (entityType !== "all") {
      params.set("entityType", entityType);
    }

    if (action !== "all") {
      params.set("action", action);
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return params.toString();
  }, [action, dateFrom, dateTo, entityType]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const response = await fetch(`/api/history?${queryString}`);
      const result = (await response.json()) as
        | { success: true; data: HistoryEvent[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถโหลดประวัติได้");
        setHistoryItems([]);
        return;
      }

      setHistoryItems(result.data);
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างโหลดประวัติ");
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [queryString]);

  const fetchAuditLogs = useCallback(async () => {
    if (!canManageAudit) {
      setLoadingAudit(false);
      setAuditLogs([]);
      return;
    }

    setLoadingAudit(true);

    try {
      const response = await fetch(`/api/audit-logs?${queryString}`);
      const result = (await response.json()) as
        | { success: true; data: AuditLogEntry[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถโหลด audit logs ได้");
        setAuditLogs([]);
        return;
      }

      setAuditLogs(result.data);
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างโหลด audit logs");
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [canManageAudit, queryString]);

  useEffect(() => {
    void fetchHistory();
    void fetchAuditLogs();
  }, [fetchAuditLogs, fetchHistory]);

  const visibleEntityOptions = useMemo(() => {
    if (canManageAudit) {
      return ENTITY_OPTIONS;
    }

    return ENTITY_OPTIONS.filter(
      (option) =>
        option.value === "all" ||
        option.value === "borrow_request" ||
        option.value === "return_transaction",
    );
  }, [canManageAudit]);

  const visibleActionOptions = useMemo(() => {
    if (canManageAudit) {
      return ACTION_OPTIONS;
    }

    return ACTION_OPTIONS.filter(
      (option) =>
        option.value === "all" ||
        option.value.startsWith("borrow_request.") ||
        option.value.startsWith("return."),
    );
  }, [canManageAudit]);

  if (!user) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">History & Audit</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">ประวัติการใช้งาน</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {canManageAudit
                ? "ติดตามเหตุการณ์ในระบบทั้งหมด และตรวจสอบ audit logs สำหรับการเปลี่ยนแปลงสำคัญ"
                : "ดูประวัติการยืม-คืนที่เกี่ยวข้องกับบัญชีของคุณ"}
            </p>
          </div>
        </div>

        {canManageAudit ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: viewMode === "history" ? "default" : "outline",
                  size: "sm",
                }),
              )}
              onClick={() => setViewMode("history")}
            >
              History
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({
                  variant: viewMode === "audit" ? "default" : "outline",
                  size: "sm",
                }),
              )}
              onClick={() => setViewMode("audit")}
            >
              Audit Logs
            </button>
          </div>
        ) : null}
      </div>

      <section className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="size-4" />
          Filters
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Combobox
            value={entityType}
            onChange={(value) => setEntityType((value || "all") as typeof entityType)}
            options={visibleEntityOptions.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="ทุกประเภท"
          />

          <Combobox
            value={action}
            onChange={(value) => setAction(value || "all")}
            options={visibleActionOptions.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="ทุกการกระทำ"
          />

          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
      </section>

      {viewMode === "history" || !canManageAudit ? (
        <section className="overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold">
              {canManageAudit ? "เหตุการณ์ในระบบ" : "ประวัติของฉัน"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              แสดงเหตุการณ์ตามสิทธิ์ของผู้ใช้งานและตัวกรองที่เลือก
            </p>
          </div>
          {loadingHistory ? (
            <div className="space-y-3 px-6 py-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : historyItems.length === 0 ? (
            <EmptyState
              title="ไม่พบประวัติ"
              description="ยังไม่มีเหตุการณ์ที่ตรงกับเงื่อนไขที่เลือก"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เมื่อ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>การกระทำ</TableHead>
                    <TableHead>อ้างอิง</TableHead>
                    <TableHead>ผู้ดำเนินการ</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(item.occurredAt)}
                      </TableCell>
                      <TableCell>{getEntityLabel(item.entityType)}</TableCell>
                      <TableCell>{getActionLabel(item.action)}</TableCell>
                      <TableCell className="font-medium">{item.reference}</TableCell>
                      <TableCell>
                        {item.actorName ?? item.actorExternalUserId ?? "system"}
                      </TableCell>
                      <TableCell className="min-w-72">{item.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      {canManageAudit && viewMode === "audit" ? (
        <section className="overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold">Audit log list</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              บันทึกการเปลี่ยนแปลงเชิงเทคนิคสำหรับตรวจสอบย้อนหลัง
            </p>
          </div>
          {loadingAudit ? (
            <div className="space-y-3 px-6 py-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState
              title="ไม่พบ audit logs"
              description="ยังไม่มี audit logs ที่ตรงกับเงื่อนไขที่เลือก"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลา</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entityId}</TableCell>
                      <TableCell>
                        {log.actorName ?? log.actorExternalUserId ?? "system"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "pointer-events-none h-7 px-2 text-xs",
                            )}
                          >
                            before: {log.hasBeforeData ? "yes" : "no"}
                          </span>
                          <span
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "pointer-events-none h-7 px-2 text-xs",
                            )}
                          >
                            after: {log.hasAfterData ? "yes" : "no"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
