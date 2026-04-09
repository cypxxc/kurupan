"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { AssetDataTable } from "@/components/tables/asset-data-table";
import { buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";

function withSelectedOption(options: string[], selected: string) {
  if (selected === "all" || options.includes(selected)) {
    return options;
  }

  return [selected, ...options];
}

export function AssetsPageClient({ initialAssets }: { initialAssets: Asset[] }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const skipInitialFetch = useRef(true);

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
        toast.error(result.error?.message ?? "Unable to load assets.");
        setAssets([]);
        return;
      }

      setAssets(result.data);
    } catch {
      toast.error("An error occurred while loading assets.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, debouncedSearch, locationFilter, statusFilter]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("assets.page.eyebrow")}
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("assets.page.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("assets.page.description")}
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/assets/series"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              {t("assets.page.manageSeries")}
            </Link>
            <Link
              href="/assets/new"
              className={cn(
                buttonVariants({ variant: "default" }),
                "gap-2 dark:text-black dark:[&_svg]:text-black",
              )}
            >
              <Plus className="size-4" />
              {t("assets.page.addAsset")}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">
            {t("assets.page.metrics.visibleItems")}
          </p>
          <p className="mt-2 text-3xl font-semibold">{assets.length}</p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">
            {t("assets.page.metrics.readyToBorrow")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
            {availableCount}
          </p>
        </div>
        <div className="metric-tile">
          <p className="text-sm text-muted-foreground">
            {t("assets.page.metrics.unavailable")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">
            {unavailableCount}
          </p>
        </div>
      </div>

      <section className="filter-shell">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          {t("assets.page.filters")}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t("assets.page.searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <Combobox
            value={statusFilter}
            onChange={(value) => setStatusFilter(value || "all")}
            options={[
              { value: "all", label: t("assets.page.filterOptions.allStatuses") },
              {
                value: "available",
                label: <StatusBadge type="asset" value="available" />,
                searchLabel: t("assets.status.available"),
              },
              {
                value: "maintenance",
                label: <StatusBadge type="asset" value="maintenance" />,
                searchLabel: t("assets.status.maintenance"),
              },
              {
                value: "retired",
                label: <StatusBadge type="asset" value="retired" />,
                searchLabel: t("assets.status.retired"),
              },
            ]}
            placeholder={t("assets.page.filterOptions.allStatuses")}
          />
          <Combobox
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value || "all")}
            options={[
              { value: "all", label: t("assets.page.filterOptions.allCategories") },
              ...categories.map((category) => ({ value: category, label: category })),
            ]}
            placeholder={t("assets.page.filterOptions.allCategories")}
          />
          <Combobox
            value={locationFilter}
            onChange={(value) => setLocationFilter(value || "all")}
            options={[
              { value: "all", label: t("assets.page.filterOptions.allLocations") },
              ...locations.map((location) => ({ value: location, label: location })),
            ]}
            placeholder={t("assets.page.filterOptions.allLocations")}
          />
        </div>
      </section>

      <AssetDataTable
        key={[debouncedSearch, statusFilter, categoryFilter, locationFilter].join(":")}
        assets={assets}
        loading={loading}
        canManage={canManage}
        searchTerm={debouncedSearch}
      />
    </div>
  );
}
