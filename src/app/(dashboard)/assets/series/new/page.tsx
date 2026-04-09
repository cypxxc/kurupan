"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { AssetCodeSeriesForm } from "@/components/forms/asset-code-series-form";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function NewAssetCodeSeriesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "staff" || user?.role === "admin";

  if (!canManage) {
    return (
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">ไม่มีสิทธิ์สร้างชุดรหัส</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้านี้สำหรับเจ้าหน้าที่และผู้ดูแลระบบเท่านั้น
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

      <AssetCodeSeriesForm mode="create" />
    </div>
  );
}
