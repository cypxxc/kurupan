"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { AssetDataTable } from "@/components/tables/asset-data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";

function withSelectedOption(options: string[], selected: string) {
  if (selected === "all" || options.includes(selected)) {
    return options;
  }

  return [selected, ...options];
}

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    }
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (categoryFilter !== "all") {
      params.set("category", categoryFilter);
    }
    if (locationFilter !== "all") {
      params.set("location", locationFilter);
    }

    try {
      const response = await fetch(`/api/assets?${params.toString()}`);
      const result = (await response.json()) as
        | { success: true; data: Asset[] }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "ไม่สามารถโหลดรายการครุภัณฑ์ได้");
        setAssets([]);
        return;
      }

      setAssets(result.data);
    } catch {
      toast.error("เกิดข้อผิดพลาดระหว่างโหลดข้อมูลครุภัณฑ์");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, debouncedSearch, locationFilter, statusFilter]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const categories = useMemo(() => {
    const options = Array.from(
      new Set(
        assets
          .map((asset) => asset.category)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return withSelectedOption(options, categoryFilter);
  }, [assets, categoryFilter]);

  const locations = useMemo(() => {
    const options = Array.from(
      new Set(
        assets
          .map((asset) => asset.location)
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return withSelectedOption(options, locationFilter);
  }, [assets, locationFilter]);

  const availableCount = assets.filter(
    (asset) => asset.status === "available" && asset.availableQty > 0,
  ).length;
  const unavailableCount = assets.filter(
    (asset) => asset.status !== "available" || asset.availableQty === 0,
  ).length;

  const handleAssetUpdated = (updatedAsset: Asset) => {
    setAssets((current) =>
      current.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Asset Management</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">รายการครุภัณฑ์</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              ค้นหา ตรวจสอบสถานะ และดูจำนวนคงเหลือของครุภัณฑ์ทั้งหมดในระบบ
            </p>
          </div>
        </div>
        {canManage ? (
          <Link
            href="/assets/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            เพิ่มครุภัณฑ์
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">จำนวนที่แสดง</p>
          <p className="mt-2 text-3xl font-semibold">{assets.length}</p>
        </div>
        <div className="rounded-3xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">พร้อมยืมได้ตอนนี้</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
            {availableCount}
          </p>
        </div>
        <div className="rounded-3xl border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">ต้องติดตาม / ใช้งานไม่ได้</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
            {unavailableCount}
          </p>
        </div>
      </div>

      <section className="rounded-3xl border bg-card px-5 py-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          ตัวกรองรายการ
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ค้นหาจากชื่อหรือรหัสครุภัณฑ์"
              className="pl-9"
            />
          </div>
          <Combobox
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || "all")}
            options={[
              { value: "all", label: "ทุกสถานะ" },
              { value: "available", label: <StatusBadge type="asset" value="available" />, searchLabel: "พร้อมใช้งาน" },
              { value: "maintenance", label: <StatusBadge type="asset" value="maintenance" />, searchLabel: "ซ่อมบำรุง" },
              { value: "retired", label: <StatusBadge type="asset" value="retired" />, searchLabel: "ปลดระวาง" },
            ]}
            placeholder="ทุกสถานะ"
          />
          <Combobox
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value || "all")}
            options={[
              { value: "all", label: "ทุกหมวดหมู่" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
            placeholder="ทุกหมวดหมู่"
          />
          <Combobox
            value={locationFilter}
            onChange={(value) => setLocationFilter(value || "all")}
            options={[
              { value: "all", label: "ทุกสถานที่" },
              ...locations.map((l) => ({ value: l, label: l })),
            ]}
            placeholder="ทุกสถานที่"
          />
        </div>
      </section>

      <AssetDataTable
        key={[debouncedSearch, statusFilter, categoryFilter, locationFilter].join(":")}
        assets={assets}
        loading={loading}
        canManage={canManage}
        searchTerm={debouncedSearch}
        onAssetUpdated={handleAssetUpdated}
      />
    </div>
  );
}
