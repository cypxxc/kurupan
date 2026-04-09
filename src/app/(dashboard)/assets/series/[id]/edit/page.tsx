"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AssetCodeSeriesForm } from "@/components/forms/asset-code-series-form";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { AssetCodeSeries } from "@/types/asset-code-series";

export default function EditAssetCodeSeriesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [series, setSeries] = useState<AssetCodeSeries | null>(null);
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
        const response = await fetch(`/api/asset-code-series/${id}`);
        const result = (await response.json()) as
          | { success: true; data: AssetCodeSeries }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "ไม่สามารถโหลดชุดรหัสได้");
          setSeries(null);
          return;
        }

        setSeries(result.data);
      } catch {
        toast.error("เกิดข้อผิดพลาดระหว่างโหลดชุดรหัส");
        setSeries(null);
      } finally {
        setLoading(false);
      }
    }

    void loadSeries();
  }, [canManage, id]);

  if (!canManage) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">ไม่มีสิทธิ์แก้ไขชุดรหัส</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้านี้สำหรับเจ้าหน้าที่และผู้ดูแลระบบเท่านั้น
        </p>
        <Link href="/assets/series" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          กลับหน้าจัดการชุดรหัส
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-[420px] animate-pulse rounded-3xl border bg-muted/60" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <h1 className="text-xl font-semibold">ไม่พบชุดรหัสที่ต้องการแก้ไข</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          กรุณาตรวจสอบรายการแล้วลองใหม่อีกครั้ง
        </p>
        <Link href="/assets/series" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          กลับหน้าจัดการชุดรหัส
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/assets/series"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าจัดการชุดรหัส
      </Link>

      <AssetCodeSeriesForm mode="edit" series={series} />
    </div>
  );
}
