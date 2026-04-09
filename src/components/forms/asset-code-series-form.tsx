"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssetCodeSeries } from "@/types/asset-code-series";

type AssetCodeSeriesFormValues = {
  name: string;
  prefix: string;
  separator: string;
  padLength: string;
  description: string;
};

const DEFAULT_VALUES: AssetCodeSeriesFormValues = {
  name: "",
  prefix: "",
  separator: "-",
  padLength: "4",
  description: "",
};

type AssetCodeSeriesFormProps = {
  mode: "create" | "edit";
  series?: AssetCodeSeries;
};

function toFormValues(series?: AssetCodeSeries): AssetCodeSeriesFormValues {
  if (!series) {
    return DEFAULT_VALUES;
  }

  return {
    name: series.name,
    prefix: series.prefix,
    separator: series.separator,
    padLength: String(series.padLength),
    description: series.description ?? "",
  };
}

export function AssetCodeSeriesForm({ mode, series }: AssetCodeSeriesFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(() => toFormValues(series));
  const [submitting, setSubmitting] = useState(false);

  const nextCounter = (series?.counter ?? 0) + 1;
  const previewCode = useMemo(() => {
    const prefix = values.prefix.trim() || "NB";
    const separator = values.separator || "-";
    const padLength = Math.max(1, Number(values.padLength || 4));

    return `${prefix}${separator}${String(nextCounter).padStart(padLength, "0")}`;
  }, [nextCounter, values.padLength, values.prefix, values.separator]);

  const handleChange = <T extends keyof AssetCodeSeriesFormValues>(
    field: T,
    value: AssetCodeSeriesFormValues[T],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      name: values.name.trim(),
      prefix: values.prefix.trim().toUpperCase(),
      separator: values.separator || "-",
      padLength: Number(values.padLength || 4),
      description: values.description.trim() || null,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/asset-code-series" : `/api/asset-code-series/${series?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as
        | { success: true; data: AssetCodeSeries }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถบันทึกชุดรหัสได้");
        return;
      }

      toast.success(mode === "create" ? "สร้างชุดรหัสแล้ว" : "อัปเดตชุดรหัสแล้ว");
      router.push("/assets/series");
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างบันทึกชุดรหัส");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} className="surface-panel surface-section">
        <div className="flex flex-col gap-2 border-b pb-5">
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? "สร้างชุดรหัสครุภัณฑ์" : "แก้ไขชุดรหัสครุภัณฑ์"}
          </h1>
          <p className="text-sm text-muted-foreground">
            กำหนด prefix และรูปแบบเลขรันเพื่อให้ระบบออก asset code อัตโนมัติ
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">ชื่อชุดรหัส</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              maxLength={100}
              required
              placeholder="โน้ตบุ๊ก"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              value={values.prefix}
              onChange={(event) => handleChange("prefix", event.target.value.toUpperCase())}
              maxLength={20}
              required
              placeholder="NB"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="separator">Separator</Label>
            <Input
              id="separator"
              value={values.separator}
              onChange={(event) => handleChange("separator", event.target.value)}
              maxLength={5}
              required
              placeholder="-"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="padLength">จำนวนหลักเลขรัน</Label>
            <Input
              id="padLength"
              type="number"
              min={1}
              max={12}
              value={values.padLength}
              onChange={(event) => handleChange("padLength", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <Textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={(event) => handleChange("description", event.target.value)}
              maxLength={255}
              placeholder="ใช้สำหรับครุภัณฑ์กลุ่มโน้ตบุ๊กและอุปกรณ์พกพา"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/assets/series" className={buttonVariants({ variant: "outline" })}>
            ยกเลิก
          </Link>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {submitting ? "กำลังบันทึก..." : "บันทึกชุดรหัส"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">ตัวอย่างรหัสถัดไป</p>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-wide">{previewCode}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            ระบบจะออกรหัสถัดไปตามลำดับนี้เมื่อสร้างครุภัณฑ์ด้วยชุดรหัสนี้
          </p>
        </div>

        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">สถานะตัวนับ</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{series?.counter ?? 0}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            เลขล่าสุดที่ถูกใช้แล้วในชุดนี้
          </p>
        </div>
      </aside>
    </div>
  );
}
