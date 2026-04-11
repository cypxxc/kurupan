import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Hash, ShieldAlert } from "lucide-react";

import { AssetSeriesPageClient } from "@/components/pages/asset-series-page-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createAssetCodeSeriesStack } from "@/modules/asset-code-series/createAssetCodeSeriesStack";
import type { AssetCodeSeries } from "@/types/asset-code-series";

export default async function AssetCodeSeriesPage() {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const canManage = actor.role === "staff" || actor.role === "admin";

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

  const { assetCodeSeriesService } = createAssetCodeSeriesStack();
  const rawSeries = await assetCodeSeriesService.listSeries(actor);

  const series: AssetCodeSeries[] = rawSeries.map((record) => ({
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    separator: record.separator,
    padLength: record.padLength,
    counter: record.counter,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/assets"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        กลับหน้าครุภัณฑ์
      </Link>

      <div className="page-header">
        <div className="space-y-2">
          <p className="page-kicker">Asset Code Series</p>
          <div>
            <h1 className="page-title">จัดการชุดรหัส</h1>
            <p className="page-description">
              กำหนด prefix, ตัวคั่น, และจำนวนหลักของเลขรัน เพื่อให้ระบบออกรหัสครุภัณฑ์
              อัตโนมัติได้สม่ำเสมอในแต่ละกลุ่มงาน
            </p>
          </div>
        </div>

        <Link
          href="/assets/series/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Hash className="size-4" />
          สร้างชุดรหัส
        </Link>
      </div>

      <AssetSeriesPageClient initialSeries={series} />
    </div>
  );
}
