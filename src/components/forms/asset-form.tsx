"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Asset, AssetFormValues } from "@/types/assets";

type AssetFormProps = {
  mode: "create" | "edit";
  asset?: Asset;
  initialValues: AssetFormValues;
};

export function AssetForm({ mode, asset, initialValues }: AssetFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<{ categories: string[]; locations: string[] }>({
    categories: [],
    locations: [],
  });

  useEffect(() => {
    fetch("/api/assets/field-options")
      .then((res) => res.json())
      .then((result: { success: boolean; data?: { categories: string[]; locations: string[] } }) => {
        if (result.success && result.data) {
          setFieldOptions(result.data);
        }
      })
      .catch(() => {});
  }, []);

  const stockSummary = useMemo(() => {
    if (!asset) {
      const nextTotalQty = Number(values.totalQty || 0);

      return {
        availableQty: nextTotalQty,
        hint: "เมื่อสร้างรายการใหม่ ระบบจะตั้งจำนวนพร้อมใช้งานเท่ากับจำนวนทั้งหมด",
      };
    }

    return {
      availableQty: asset.availableQty,
      hint: "จำนวนพร้อมใช้งานถูกคำนวณจาก workflow การยืม-คืน และแก้ไขจากหน้าฟอร์มนี้ไม่ได้",
    };
  }, [asset, values.totalQty]);

  const handleChange = <T extends keyof AssetFormValues>(
    field: T,
    value: AssetFormValues[T],
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
      assetCode: values.assetCode.trim(),
      name: values.name.trim(),
      category: values.category.trim() || null,
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      totalQty: Number(values.totalQty),
      status: values.status,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/assets" : `/api/assets/${asset?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = (await response.json()) as
        | { success: true; data: Asset }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้");
        return;
      }

      toast.success(
        mode === "create"
          ? "เพิ่มครุภัณฑ์เรียบร้อยแล้ว"
          : "อัปเดตครุภัณฑ์เรียบร้อยแล้ว",
      );
      router.push(`/assets/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border bg-card px-6 py-6 shadow-sm"
      >
        <div className="flex flex-col gap-2 border-b pb-5">
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? "เพิ่มครุภัณฑ์" : "แก้ไขครุภัณฑ์"}
          </h1>
          <p className="text-sm text-muted-foreground">
            กำหนดข้อมูลพื้นฐาน สถานะ และจำนวนรวมของครุภัณฑ์ในระบบ
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assetCode">รหัสครุภัณฑ์</Label>
            <Input
              id="assetCode"
              value={values.assetCode}
              onChange={(event) => handleChange("assetCode", event.target.value)}
              required
              maxLength={50}
              placeholder="เช่น NB-1001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">ชื่อครุภัณฑ์</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              required
              maxLength={255}
              placeholder="ระบุชื่อที่ใช้เรียกในระบบ"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">หมวดหมู่</Label>
            <CreatableCombobox
              id="category"
              options={fieldOptions.categories}
              value={values.category}
              onChange={(v) => handleChange("category", v)}
              maxLength={100}
              placeholder="เช่น Notebook, Projector"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">สถานที่จัดเก็บ</Label>
            <CreatableCombobox
              id="location"
              options={fieldOptions.locations}
              value={values.location}
              onChange={(v) => handleChange("location", v)}
              maxLength={255}
              placeholder="เช่น ชั้น 2 ห้องอุปกรณ์"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalQty">จำนวนทั้งหมด</Label>
            <Input
              id="totalQty"
              type="number"
              min={0}
              value={values.totalQty}
              onChange={(event) => handleChange("totalQty", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">สถานะ</Label>
            <Combobox
              id="status"
              value={values.status}
              onChange={(value) =>
                handleChange("status", (value || "available") as AssetFormValues["status"])
              }
              options={[
                { value: "available", label: <StatusBadge type="asset" value="available" />, searchLabel: "พร้อมใช้งาน" },
                { value: "maintenance", label: <StatusBadge type="asset" value="maintenance" />, searchLabel: "ซ่อมบำรุง" },
                { value: "retired", label: <StatusBadge type="asset" value="retired" />, searchLabel: "ปลดระวาง" },
              ]}
              placeholder="เลือกสถานะ"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              rows={5}
              value={values.description}
              onChange={(event) => handleChange("description", event.target.value)}
              maxLength={2000}
              placeholder="รายละเอียดเพิ่มเติม เช่น รุ่น อุปกรณ์ประกอบ หรือข้อควรระวัง"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={asset ? `/assets/${asset.id}` : "/assets"}
            className={buttonVariants({ variant: "outline" })}
          >
            ยกเลิก
          </Link>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">สถานะปัจจุบัน</p>
          <div className="mt-3">
            <StatusBadge type="asset" value={values.status} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{stockSummary.hint}</p>
        </div>

        <div className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">สรุปจำนวน</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-muted/70 px-4 py-3">
              <p className="text-xs text-muted-foreground">พร้อมใช้งาน</p>
              <p className="mt-1 text-2xl font-semibold">
                {stockSummary.availableQty}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/70 px-4 py-3">
              <p className="text-xs text-muted-foreground">จำนวนทั้งหมดหลังบันทึก</p>
              <p className="mt-1 text-2xl font-semibold">
                {Number(values.totalQty || 0)}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
