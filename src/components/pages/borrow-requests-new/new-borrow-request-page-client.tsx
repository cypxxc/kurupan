"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
import {
  Textarea,
} from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  BorrowableAsset,
} from "@/types/borrow-requests";

export function NewBorrowRequestPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<BorrowableAsset[]>([]);
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      setLoadingAssets(true);

      try {
        const response = await fetch("/api/assets?status=available");
        const result = (await response.json()) as
          | { success: true; data: BorrowableAsset[] }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "Unable to load assets.");
          setAssets([]);
          return;
        }

        setAssets(result.data.filter((asset) => asset.availableQty > 0));
      } catch {
        toast.error("An error occurred while loading assets.");
        setAssets([]);
      } finally {
        setLoadingAssets(false);
      }
    }

    void loadAssets();
  }, []);

  useEffect(() => {
    const preselectedAssetId = searchParams.get("assetId");
    if (!preselectedAssetId || assets.length === 0) {
      return;
    }

    const asset = assets.find((entry) => entry.id === Number(preselectedAssetId));
    if (!asset || items.some((item) => item.assetId === asset.id)) {
      return;
    }

    setItems((current) => [...current, makeBorrowRequestItem(asset)]);
  }, [assets, items, searchParams, setItems]);

  const filteredAssets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) => {
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.assetCode.toLowerCase().includes(query) ||
        (asset.category ?? "").toLowerCase().includes(query) ||
        (asset.location ?? "").toLowerCase().includes(query)
      );
    });
  }, [assets, searchTerm]);

  const totalRequestedQty = useMemo(
    () => items.reduce((sum, item) => sum + item.requestedQty, 0),
    [items],
  );

  const addItem = (asset: BorrowableAsset) => {
    if (items.some((item) => item.assetId === asset.id)) {
      toast.error("This asset is already in the request.");
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
      toast.error("Select at least one asset before submitting.");
      return;
    }

    if (dueDate < startDate) {
      toast.error("Due date must be on or after the borrow date.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/borrow-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      const result = (await response.json()) as
        | { success: true; data: { id: number } }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to create borrow request.");
        return;
      }

      toast.success("Borrow request created.");
      clearDraft();
      router.push(`/borrow-requests/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error("An error occurred while creating the request.");
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
        Back to requests
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="surface-panel surface-section space-y-6">
          <div className="flex flex-col gap-2 border-b pb-5">
            <h1 className="text-2xl font-semibold">Create borrow request</h1>
            <p className="text-sm text-muted-foreground">
              Select multiple assets and set the requested quantity for each item in one request.
            </p>
          </div>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea
                id="purpose"
                rows={4}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Describe why the assets are needed"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
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
              <Label htmlFor="dueDate">Due date</Label>
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
                <h2 className="text-lg font-semibold">Selected items</h2>
                <p className="text-sm text-muted-foreground">
                  Review quantities before submitting the request.
                </p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                {items.length} item{items.length === 1 ? "" : "s"}
              </div>
            </div>

            <SelectedBorrowItemsTable
              items={items}
              onQtyChange={updateQty}
              onRemove={removeItem}
            />
          </section>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/borrow-requests" className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            <Button type="submit" disabled={submitting || items.length === 0}>
              {submitting ? "Submitting..." : "Submit request"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <BorrowRequestSummary itemCount={items.length} totalRequestedQty={totalRequestedQty} />
          <BorrowAssetPicker
            searchTerm={searchTerm}
            loading={loadingAssets}
            assets={filteredAssets}
            onSearchTermChange={setSearchTerm}
            onSelect={addItem}
          />
        </aside>
      </div>
    </div>
  );
}
