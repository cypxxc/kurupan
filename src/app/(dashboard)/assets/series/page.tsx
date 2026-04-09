"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AssetCodeSeriesTable } from "@/components/tables/asset-code-series-table";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { AssetCodeSeries } from "@/types/asset-code-series";

export default function AssetCodeSeriesPage() {
  const { user } = useAuth();
  const [series, setSeries] = useState<AssetCodeSeries[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    async function loadSeries() {
      setLoading(true);

      try {
        const response = await fetch("/api/asset-code-series");
        const result = (await response.json()) as
          | { success: true; data: AssetCodeSeries[] }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถโหลดชุดรหัสได้");
          setSeries([]);
          return;
        }

        setSeries(result.data);
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดชุดรหัส");
        setSeries([]);
      } finally {
        setLoading(false);
      }
    }

    void loadSeries();
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">ไม่มีสิทธิ์จัดการชุดรหัส</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้านี้สำหรับเจ้าหน้าที่และผู้ดูแลระบบเท่านั้น
        </p>
        <Link href="/assets" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          กลับหน้ารายการครุภัณฑ์
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/assets"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าครุภัณฑ์
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Asset Code Series</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">จัดการชุดรหัส</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              กำหนด prefix และเลขรันเพื่อออก asset code อัตโนมัติ
            </p>
          </div>
        </div>

        <Link
          href="/assets/series/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Plus className="size-4" />
          สร้างชุดรหัส
        </Link>
      </div>

      <AssetCodeSeriesTable
        series={series}
        loading={loading}
        onDeleted={(id) => setSeries((current) => current.filter((item) => item.id !== id))}
      />
    </div>
  );
}
