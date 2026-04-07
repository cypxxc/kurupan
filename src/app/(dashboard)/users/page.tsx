"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { LegacySearchUser, ManagedUser } from "@/types/users";

type RoleFilter = "all" | ManagedUser["role"];
type ActiveFilter = "all" | "true" | "false";
type UserDraft = {
  role: ManagedUser["role"];
  isActive: boolean;
};
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error?: { message?: string } };

const ROLE_OPTIONS: Array<{ value: ManagedUser["role"]; label: string }> = [
  { value: "borrower", label: "ผู้ยืม" },
  { value: "staff", label: "เจ้าหน้าที่" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
];

const ACTIVE_OPTIONS = [
  { value: "true", label: "ใช้งาน" },
  { value: "false", label: "ปิดใช้งาน" },
] as const;

function toActiveFilterValue(value: boolean) {
  return value ? "true" : "false";
}

function getSourceLabel(source: ManagedUser["source"]) {
  return source === "legacy" ? "Legacy" : "Local";
}

function buildDraftMap(users: ManagedUser[]) {
  return Object.fromEntries(
    users.map((item) => [
      item.externalUserId,
      {
        role: item.role,
        isActive: item.isActive,
      },
    ]),
  ) as Record<string, UserDraft>;
}

function buildLegacyDraftMap(users: LegacySearchUser[]) {
  return Object.fromEntries(
    users.map((item) => [
      item.externalUserId,
      {
        role: item.currentRole,
        isActive: item.currentIsActive,
      },
    ]),
  ) as Record<string, UserDraft>;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border bg-card px-5 py-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function UsersPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const [legacyQuery, setLegacyQuery] = useState("");
  const [legacyResults, setLegacyResults] = useState<LegacySearchUser[]>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [legacyDrafts, setLegacyDrafts] = useState<Record<string, UserDraft>>({});
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== "admin") {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);

    try {
      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (roleFilter !== "all") {
        params.set("role", roleFilter);
      }

      if (activeFilter !== "all") {
        params.set("isActive", activeFilter);
      }

      const response = await fetch(`/api/users?${params.toString()}`);
      const result = (await response.json()) as ApiResult<ManagedUser[]>;

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถโหลดรายชื่อผู้ใช้ได้");
        setUsers([]);
        setDrafts({});
        return;
      }

      setUsers(result.data);
      setDrafts(buildDraftMap(result.data));
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างโหลดรายชื่อผู้ใช้");
      setUsers([]);
      setDrafts({});
    } finally {
      setLoadingUsers(false);
    }
  }, [activeFilter, debouncedSearch, roleFilter, user?.role]);

  const searchLegacyUsers = useCallback(
    async (queryValue: string) => {
      if (user?.role !== "admin") {
        return;
      }

      const trimmedQuery = queryValue.trim();
      if (trimmedQuery.length < 2) {
        toast.error("กรุณากรอกคำค้นหาอย่างน้อย 2 ตัวอักษร");
        return;
      }

      setLoadingLegacy(true);

      try {
        const params = new URLSearchParams({ query: trimmedQuery });
        const response = await fetch(`/api/users/legacy-search?${params.toString()}`);
        const result = (await response.json()) as ApiResult<LegacySearchUser[]>;

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถค้นหาผู้ใช้จากระบบเดิมได้");
          setLegacyResults([]);
          setLegacyDrafts({});
          return;
        }

        setLegacyResults(result.data);
        setLegacyDrafts(buildLegacyDraftMap(result.data));
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างค้นหาผู้ใช้จากระบบเดิม");
        setLegacyResults([]);
        setLegacyDrafts({});
      } finally {
        setLoadingLegacy(false);
      }
    },
    [user?.role],
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const totalUsers = users.length;
  const activeUsers = useMemo(
    () => users.filter((item) => item.isActive).length,
    [users],
  );
  const adminUsers = useMemo(
    () => users.filter((item) => item.role === "admin").length,
    [users],
  );

  const updateDraft = (externalUserId: string, nextDraft: Partial<UserDraft>) => {
    setDrafts((current) => ({
      ...current,
      [externalUserId]: {
        role: current[externalUserId]?.role ?? "borrower",
        isActive: current[externalUserId]?.isActive ?? true,
        ...nextDraft,
      },
    }));
  };

  const updateLegacyDraft = (
    externalUserId: string,
    nextDraft: Partial<UserDraft>,
  ) => {
    setLegacyDrafts((current) => ({
      ...current,
      [externalUserId]: {
        role: current[externalUserId]?.role ?? "borrower",
        isActive: current[externalUserId]?.isActive ?? true,
        ...nextDraft,
      },
    }));
  };

  const handleSaveUser = async (managedUser: ManagedUser) => {
    const draft = drafts[managedUser.externalUserId];
    if (!draft) {
      return;
    }

    setSavingUserId(managedUser.externalUserId);

    try {
      const response = await fetch(`/api/users/${managedUser.externalUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: draft.role,
          isActive: draft.isActive,
        }),
      });
      const result = (await response.json()) as ApiResult<ManagedUser>;

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถอัปเดตผู้ใช้ได้");
        return;
      }

      setUsers((current) =>
        current.map((item) =>
          item.externalUserId === managedUser.externalUserId ? result.data : item,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [managedUser.externalUserId]: {
          role: result.data.role,
          isActive: result.data.isActive,
        },
      }));
      toast.success("บันทึกการเปลี่ยนแปลงแล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างอัปเดตผู้ใช้");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleOnboardLegacyUser = async (legacyUser: LegacySearchUser) => {
    const draft = legacyDrafts[legacyUser.externalUserId];
    if (!draft) {
      return;
    }

    setOnboardingUserId(legacyUser.externalUserId);

    try {
      const response = await fetch(`/api/users/${legacyUser.externalUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: draft.role,
          isActive: draft.isActive,
        }),
      });
      const result = (await response.json()) as ApiResult<ManagedUser>;

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถเพิ่มสิทธิ์ผู้ใช้ได้");
        return;
      }

      setLegacyResults((current) =>
        current.map((item) =>
          item.externalUserId === legacyUser.externalUserId
            ? {
                ...item,
                isManaged: true,
                currentRole: result.data.role,
                currentIsActive: result.data.isActive,
              }
            : item,
        ),
      );
      await fetchUsers();
      toast.success(
        legacyUser.isManaged ? "อัปเดตสิทธิ์ผู้ใช้แล้ว" : "เพิ่มผู้ใช้เข้าสู่ระบบแล้ว",
      );
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างบันทึกผู้ใช้จากระบบเดิม");
    } finally {
      setOnboardingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <CardTitle>ไม่มีสิทธิ์เข้าถึงหน้านี้</CardTitle>
              <CardDescription>
                หน้าจัดการผู้ใช้เปิดให้เฉพาะผู้ดูแลระบบเท่านั้น
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            กลับไปหน้า Dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">User Management</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">จัดการผู้ใช้</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              ดูรายชื่อผู้ใช้ทั้งหมด ค้นหาจากระบบเดิม และกำหนดสิทธิ์การใช้งานตามบทบาท
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="ผู้ใช้ที่จัดการในระบบ" value={totalUsers} />
        <MetricCard label="ผู้ใช้ที่เปิดใช้งาน" value={activeUsers} />
        <MetricCard label="ผู้ดูแลระบบ" value={adminUsers} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" />
                ตัวกรองผู้ใช้
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="ค้นหาจากชื่อ username email หรือรหัสพนักงาน"
                    className="pl-9"
                  />
                </div>
              </div>

              <Combobox
                value={roleFilter}
                onChange={(value) => setRoleFilter((value || "all") as RoleFilter)}
                options={[
                  { value: "all", label: "ทุกบทบาท" },
                  ...ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                ]}
                placeholder="ทุกบทบาท"
              />

              <Combobox
                value={activeFilter}
                onChange={(value) => setActiveFilter((value || "all") as ActiveFilter)}
                options={[
                  { value: "all", label: "ทุกสถานะ" },
                  ...ACTIVE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                ]}
                placeholder="ทุกสถานะ"
              />

              <Button variant="outline" onClick={() => void fetchUsers()}>
                รีเฟรชรายการ
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>ผู้ใช้ที่มี local access</CardTitle>
              <CardDescription>
                แสดง externalUserId, role, isActive และ grantedBy พร้อมแก้ไขแบบ inline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>externalUserId</TableHead>
                    <TableHead>grantedBy</TableHead>
                    <TableHead>role</TableHead>
                    <TableHead>isActive</TableHead>
                    <TableHead className="text-right">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        กำลังโหลดรายชื่อผู้ใช้...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        ไม่พบผู้ใช้ตามตัวกรองที่เลือก
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((managedUser) => {
                      const draft = drafts[managedUser.externalUserId] ?? {
                        role: managedUser.role,
                        isActive: managedUser.isActive,
                      };
                      const isSelf = managedUser.externalUserId === user.externalUserId;
                      const disabled = savingUserId === managedUser.externalUserId;

                      return (
                        <TableRow key={managedUser.externalUserId}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium">{managedUser.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {managedUser.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {managedUser.email ?? "-"} / {getSourceLabel(managedUser.source)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top font-mono text-xs">
                            {managedUser.externalUserId}
                          </TableCell>
                          <TableCell className="align-top">
                            {managedUser.grantedByExternalUserId ?? "-"}
                          </TableCell>
                          <TableCell className="align-top">
                            <Combobox
                              value={draft.role}
                              onChange={(value) =>
                                updateDraft(managedUser.externalUserId, {
                                  role: value as ManagedUser["role"],
                                })
                              }
                              disabled={disabled || isSelf}
                              options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                              className="w-[160px]"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Combobox
                              value={toActiveFilterValue(draft.isActive)}
                              onChange={(value) =>
                                updateDraft(managedUser.externalUserId, {
                                  isActive: value === "true",
                                })
                              }
                              disabled={disabled || isSelf}
                              options={ACTIVE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                              className="w-[140px]"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => void handleSaveUser(managedUser)}
                                disabled={disabled}
                              >
                                {disabled ? "กำลังบันทึก..." : "บันทึก"}
                              </Button>
                            </div>
                            {isSelf ? (
                              <p className="mt-2 text-right text-xs text-muted-foreground">
                                บัญชีของคุณเองจะไม่สามารถถอดสิทธิ์ admin หรือปิดใช้งานได้
                              </p>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="size-5" />
              </div>
              <div>
                <CardTitle>เพิ่มผู้ใช้จากระบบเดิม</CardTitle>
                <CardDescription>
                  ค้นหาบัญชีจาก legacy system แล้วกำหนด role เพื่อเปิดใช้งานในระบบนี้
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Input
                value={legacyQuery}
                onChange={(event) => setLegacyQuery(event.target.value)}
                placeholder="ค้นหาจากชื่อ username email หรือรหัสพนักงาน"
              />
              <Button
                className="w-full"
                onClick={() => void searchLegacyUsers(legacyQuery)}
                disabled={loadingLegacy}
              >
                {loadingLegacy ? "กำลังค้นหา..." : "ค้นหาผู้ใช้จากระบบเดิม"}
              </Button>
            </div>

            <div className="space-y-3">
              {legacyResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  ยังไม่มีผลลัพธ์จากการค้นหา
                </div>
              ) : (
                legacyResults.map((legacyUser) => {
                  const draft = legacyDrafts[legacyUser.externalUserId] ?? {
                    role: legacyUser.currentRole,
                    isActive: legacyUser.currentIsActive,
                  };
                  const saving = onboardingUserId === legacyUser.externalUserId;

                  return (
                    <div
                      key={legacyUser.externalUserId}
                      className="rounded-2xl border bg-background px-4 py-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{legacyUser.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              {legacyUser.username}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
                              legacyUser.isManaged && "border-primary/30 bg-primary/5 text-primary",
                            )}
                          >
                            {legacyUser.isManaged ? "จัดการแล้ว" : "ยังไม่เพิ่ม"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {legacyUser.email ?? legacyUser.externalUserId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {legacyUser.department || "ไม่ระบุหน่วยงาน"}
                          {legacyUser.employeeCode ? ` / รหัส ${legacyUser.employeeCode}` : ""}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Combobox
                          value={draft.role}
                          onChange={(value) =>
                            updateLegacyDraft(legacyUser.externalUserId, {
                              role: value as ManagedUser["role"],
                            })
                          }
                          disabled={saving}
                          options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        />

                        <Combobox
                          value={toActiveFilterValue(draft.isActive)}
                          onChange={(value) =>
                            updateLegacyDraft(legacyUser.externalUserId, {
                              isActive: value === "true",
                            })
                          }
                          disabled={saving}
                          options={ACTIVE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        />
                      </div>

                      <Button
                        className="mt-4 w-full"
                        onClick={() => void handleOnboardLegacyUser(legacyUser)}
                        disabled={saving}
                      >
                        {saving
                          ? "กำลังบันทึก..."
                          : legacyUser.isManaged
                            ? "อัปเดตสิทธิ์ผู้ใช้"
                            : "เพิ่มผู้ใช้"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
