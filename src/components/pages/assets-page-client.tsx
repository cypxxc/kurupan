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
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/components/providers/i18n-provider";
import type { PaginatedResult } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/assets";

const PAGE_SIZE = 10;

type AssetFieldOptions = {
  categories: string[];
  locations: string[];
};

function withSelectedOption(options: string[], selected: string) {
  if (selected === "all" || options.includes(selected)) {
    return options;
  }

  return [selected, ...options];
}

export function AssetsPageClient({
  initialPage,
}: {
  initialPage: PaginatedResult<Asset>;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [assets, setAssets] = useState<Asset[]>(initialPage.items);
  const [pagination, setPagination] = useState<PaginatedResult<Asset>>(initialPage);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(initialPage.page);
  const [fieldOptions, setFieldOptions] = useState<AssetFieldOptions>({
    categories: [],
    locations: [],
  });
  const skipInitialFetch = useRef(true);
  const filterKeyRef = useRef("");

  const canManage = user?.role === "staff" || user?.role === "admin";
  const filterKey = [
    debouncedSearch,
    statusFilter,
    stockFilter,
    categoryFilter,
    locationFilter,
  ].join(":");

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
    if (stockFilter !== "all") {
      params.set("stock", stockFilter);
    }
    if (categoryFilter !== "all") {
      params.set("category", categoryFilter);
    }
    if (locationFilter !== "all") {
      params.set("location", locationFilter);
    }
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const data = await apiClient.get<PaginatedResult<Asset>>("/api/assets", {
        query: params,
      });

      setAssets(data.items);
      setPagination(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "An error occurred while loading assets."));
      setAssets([]);
      setPagination((current) => ({
        ...current,
        items: [],
        page,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      }));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, debouncedSearch, locationFilter, page, statusFilter, stockFilter]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiClient.get<AssetFieldOptions>("/api/assets/field-options");
        setFieldOptions(data);
      } catch {
        // Keep the page usable if field options fail to load.
      }
    })();
  }, []);

  useEffect(() => {
    const filtersChanged = filterKeyRef.current !== filterKey;
    filterKeyRef.current = filterKey;

    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }

    void fetchAssets();
  }, [fetchAssets, filterKey, page]);

  const categories = useMemo(() => {
    const options = [...fieldOptions.categories].sort((left, right) =>
      left.localeCompare(right),
    );

    return withSelectedOption(options, categoryFilter);
  }, [categoryFilter, fieldOptions.categories]);

  const locations = useMemo(() => {
    const options = [...fieldOptions.locations].sort((left, right) =>
      left.localeCompare(right),
    );

    return withSelectedOption(options, locationFilter);
  }, [fieldOptions.locations, locationFilter]);

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
          <p className="mt-2 text-3xl font-semibold">{pagination.total}</p>
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
        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
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
            value={stockFilter}
            onChange={(value) => setStockFilter(value || "all")}
            options={[
              { value: "all", label: t("assets.page.filterOptions.allStock") },
              {
                value: "in_stock",
                label: t("assets.page.filterOptions.inStock"),
              },
              {
                value: "out_of_stock",
                label: t("assets.page.filterOptions.outOfStock"),
              },
            ]}
            placeholder={t("assets.page.filterOptions.allStock")}
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
        key={[debouncedSearch, statusFilter, stockFilter, categoryFilter, locationFilter].join(":")}
        assets={assets}
        loading={loading}
        canManage={canManage}
        searchTerm={debouncedSearch}
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
