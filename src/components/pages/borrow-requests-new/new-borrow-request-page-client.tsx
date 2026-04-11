"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { BorrowAssetPicker } from "@/components/pages/borrow-requests-new/borrow-asset-picker";
import {
  makeBorrowRequestItem,
  todayString,
} from "@/components/pages/borrow-requests-new/borrow-request-form-helpers";
import { BorrowRequestSummary } from "@/components/pages/borrow-requests-new/borrow-request-summary";
import { SelectedBorrowItemsTable } from "@/components/pages/borrow-requests-new/selected-borrow-items-table";
import { useBorrowRequestDraft } from "@/components/pages/borrow-requests-new/use-borrow-request-draft";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import type { PaginatedResult } from "@/lib/pagination";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BorrowableAsset } from "@/types/borrow-requests";

export function NewBorrowRequestPageClient() {
  const { t } = useI18n();
  const pageSize = 10;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<BorrowableAsset[]>([]);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPagination, setAssetPagination] = useState<PaginatedResult<BorrowableAsset>>({
    items: [],
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loadingAssets, setLoadingAssets] = useState(true);
  const {
    items,
    setItems,
    purpose,
    setPurpose,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    clearDraft,
  } = useBorrowRequestDraft();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setAssetPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    async function loadAssets() {
      setLoadingAssets(true);

      try {
        const params = new URLSearchParams({
          borrowable: "true",
          page: String(assetPage),
          limit: String(pageSize),
        });
        if (debouncedSearchTerm) {
          params.set("search", debouncedSearchTerm);
        }

        const data = await apiClient.get<PaginatedResult<BorrowableAsset>>("/api/assets", {
          query: params,
        });

        setAssets(data.items);
        setAssetPagination({
          ...data,
          items: data.items,
        });
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("borrowRequestNew.loadAssetsError")));
        setAssets([]);
        setAssetPagination((current) => ({
          ...current,
          items: [],
          page: assetPage,
          limit: pageSize,
          total: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        }));
      } finally {
        setLoadingAssets(false);
      }
    }

    void loadAssets();
  }, [assetPage, debouncedSearchTerm, t]);

  useEffect(() => {
    const preselectedAssetId = searchParams.get("assetId");
    if (!preselectedAssetId) {
      return;
    }

    const selectedAssetId = Number(preselectedAssetId);

    if (items.some((item) => item.assetId === selectedAssetId)) {
      return;
    }

    const asset = assets.find((entry) => entry.id === selectedAssetId);
    if (asset) {
      setItems((current) => [...current, makeBorrowRequestItem(asset)]);
      return;
    }

    let active = true;

    async function loadPreselectedAsset() {
      try {
        const data = await apiClient.get<BorrowableAsset & { availableQty: number }>(
          `/api/assets/${selectedAssetId}`,
          {
            query: { includeActivity: false },
          },
        );

        if (!active || data.availableQty <= 0) {
          return;
        }

        setItems((current) => {
          if (current.some((item) => item.assetId === data.id)) {
            return current;
          }

          return [...current, makeBorrowRequestItem(data)];
        });
      } catch {
        // Ignore failed preselection and keep the page usable.
      }
    }

    void loadPreselectedAsset();

    return () => {
      active = false;
    };
  }, [assets, items, searchParams, setItems]);

  const totalRequestedQty = items.reduce((sum, item) => sum + item.requestedQty, 0);

  const addItem = (asset: BorrowableAsset) => {
    if (items.some((item) => item.assetId === asset.id)) {
      toast.error(t("borrowRequestNew.duplicateAsset"));
      return;
    }

    setItems((current) => [...current, makeBorrowRequestItem(asset)]);
  };

  const removeItem = (assetId: number) => {
    setItems((current) => current.filter((item) => item.assetId !== assetId));
  };

  const updateQty = (assetId: number, value: string) => {
    const numeric = Number(value);

    setItems((current) =>
      current.map((item) => {
        if (item.assetId !== assetId || !Number.isFinite(numeric)) {
          return item;
        }

        return {
          ...item,
          requestedQty: Math.max(1, Math.min(item.availableQty, numeric)),
        };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error(t("borrowRequestNew.selectAtLeastOne"));
      return;
    }

    if (dueDate < startDate) {
      toast.error(t("borrowRequestNew.dueDateOrder"));
      return;
    }

    setSubmitting(true);

    try {
      const data = await apiClient.post<{ id: number }>("/api/borrow-requests", {
        body: JSON.stringify({
          purpose: purpose.trim(),
          startDate,
          dueDate,
          items: items.map((item) => ({
            assetId: item.assetId,
            requestedQty: item.requestedQty,
          })),
        }),
      });

      toast.success(t("borrowRequestNew.created"));
      clearDraft();
      router.push(`/borrow-requests/${data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("borrowRequestNew.createError")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/borrow-requests"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        {t("borrowRequestNew.back")}
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="surface-panel surface-section space-y-6">
          <div className="flex flex-col gap-2 border-b pb-5">
            <h1 className="text-2xl font-semibold">{t("borrowRequestNew.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("borrowRequestNew.description")}</p>
          </div>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">{t("borrowRequestNew.labels.purpose")}</Label>
              <Textarea
                id="purpose"
                rows={4}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder={t("borrowRequestNew.placeholders.purpose")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("borrowRequestNew.labels.startDate")}</Label>
              <Input
                id="startDate"
                type="date"
                min={todayString()}
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (event.target.value > dueDate) {
                    setDueDate(event.target.value);
                  }
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t("borrowRequestNew.labels.dueDate")}</Label>
              <Input
                id="dueDate"
                type="date"
                min={startDate}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t("borrowRequestNew.labels.selectedItems")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("borrowRequestNew.help.selectedItems")}
                </p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                {items.length === 1
                  ? t("borrowRequestNew.itemCount", { count: items.length })
                  : t("borrowRequestNew.itemCountPlural", { count: items.length })}
              </div>
            </div>

            <SelectedBorrowItemsTable items={items} onQtyChange={updateQty} onRemove={removeItem} />
          </section>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/borrow-requests" className={buttonVariants({ variant: "outline" })}>
              {t("borrowRequestNew.actions.cancel")}
            </Link>
            <Button type="submit" disabled={submitting || items.length === 0}>
              {submitting ? t("borrowRequestNew.actions.submitting") : t("borrowRequestNew.actions.submit")}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <BorrowRequestSummary itemCount={items.length} totalRequestedQty={totalRequestedQty} />
          <BorrowAssetPicker
            searchTerm={searchTerm}
            loading={loadingAssets}
            assets={assets}
            page={assetPagination.page}
            total={assetPagination.total}
            totalPages={assetPagination.totalPages}
            limit={assetPagination.limit}
            onSearchTermChange={setSearchTerm}
            onPageChange={setAssetPage}
            onSelect={addItem}
          />
        </aside>
      </div>
    </div>
  );
}
