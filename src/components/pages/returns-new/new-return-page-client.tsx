"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { ReturnItemsTable } from "@/components/pages/returns-new/return-items-table";
import { ReturnPermissionDenied } from "@/components/pages/returns-new/return-permission-denied";
import { ReturnRequestDetails } from "@/components/pages/returns-new/return-request-details";
import { buildReturnedQtyMap } from "@/components/pages/returns-new/return-form-helpers";
import { ReturnSummarySidebar } from "@/components/pages/returns-new/return-summary-sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BorrowRequestDetail } from "@/types/borrow-requests";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  type ReturnFormItem,
  type ReturnTransaction,
} from "@/types/returns";

export function NewReturnPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [eligibleRequests, setEligibleRequests] = useState<BorrowRequestDetail[]>([]);
  const [selectedBorrowRequestId, setSelectedBorrowRequestId] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequestDetail | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnFormItem[]>([]);
  const [note, setNote] = useState("");
  const [returnedAt, setReturnedAt] = useState(toDateTimeLocalValue());
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    async function loadEligibleRequests() {
      setLoadingRequests(true);

      try {
        const [approvedResponse, partialResponse] = await Promise.all([
          fetch("/api/borrow-requests?status=approved"),
          fetch("/api/borrow-requests?status=partially_returned"),
        ]);

        const [approvedResult, partialResult] = (await Promise.all([
          approvedResponse.json(),
          partialResponse.json(),
        ])) as [
          { success: boolean; data?: BorrowRequestDetail[]; error?: { message?: string } },
          { success: boolean; data?: BorrowRequestDetail[]; error?: { message?: string } },
        ];

        if (!approvedResult.success || !partialResult.success) {
          toast.error(
            approvedResult.error?.message ??
              partialResult.error?.message ??
              "Unable to load requests eligible for return.",
          );
          setEligibleRequests([]);
          return;
        }

        const merged = [...(approvedResult.data ?? []), ...(partialResult.data ?? [])]
          .filter(
            (request, index, allRequests) =>
              allRequests.findIndex((candidate) => candidate.id === request.id) === index,
          )
          .sort((left, right) => right.id - left.id);

        setEligibleRequests(merged);

        const preselectedRequestId = searchParams.get("borrowRequestId");
        if (preselectedRequestId) {
          setSelectedBorrowRequestId(preselectedRequestId);
        }
      } catch {
        toast.error("An error occurred while loading returnable requests.");
        setEligibleRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    }

    if (canManage) {
      void loadEligibleRequests();
    } else {
      setLoadingRequests(false);
    }
  }, [canManage, searchParams]);

  useEffect(() => {
    async function loadSelectedRequest() {
      if (!selectedBorrowRequestId) {
        setSelectedRequest(null);
        setReturnItems([]);
        return;
      }

      setLoadingItems(true);

      try {
        const [requestResponse, returnsResponse] = await Promise.all([
          fetch(`/api/borrow-requests/${selectedBorrowRequestId}`),
          fetch(`/api/returns?borrowRequestId=${selectedBorrowRequestId}`),
        ]);

        const [requestResult, returnsResult] = (await Promise.all([
          requestResponse.json(),
          returnsResponse.json(),
        ])) as [
          { success: boolean; data?: BorrowRequestDetail; error?: { message?: string } },
          { success: boolean; data?: ReturnTransaction[]; error?: { message?: string } },
        ];

        if (!requestResult.success || !returnsResult.success || !requestResult.data) {
          toast.error(
            requestResult.error?.message ??
              returnsResult.error?.message ??
              "Unable to load the selected borrow request.",
          );
          setSelectedRequest(null);
          setReturnItems([]);
          return;
        }

        const returnedQtyMap = buildReturnedQtyMap(returnsResult.data ?? []);
        const nextItems: ReturnFormItem[] = requestResult.data.items
          .map((item) => {
            const approvedQty = item.approvedQty ?? 0;
            const returnedQty = returnedQtyMap.get(item.id) ?? 0;
            const remainingQty = Math.max(0, approvedQty - returnedQty);

            return {
              borrowRequestItemId: item.id,
              assetId: item.assetId,
              assetCode: item.assetCode,
              assetName: item.assetName,
              approvedQty,
              returnedQty,
              remainingQty,
              selected: remainingQty > 0,
              returnQty: remainingQty > 0 ? remainingQty : 0,
              condition: "good" as const,
              note: "",
            };
          })
          .filter((item) => item.remainingQty > 0);

        setSelectedRequest(requestResult.data);
        setReturnItems(nextItems);
      } catch {
        toast.error("An error occurred while loading outstanding items.");
        setSelectedRequest(null);
        setReturnItems([]);
      } finally {
        setLoadingItems(false);
      }
    }

    void loadSelectedRequest();
  }, [selectedBorrowRequestId]);

  const activeItems = useMemo(
    () => returnItems.filter((item) => item.selected && item.returnQty > 0),
    [returnItems],
  );

  const totalQty = useMemo(
    () => activeItems.reduce((sum, item) => sum + item.returnQty, 0),
    [activeItems],
  );

  const updateItem = (
    borrowRequestItemId: number,
    updater: (item: ReturnFormItem) => ReturnFormItem,
  ) => {
    setReturnItems((current) =>
      current.map((item) =>
        item.borrowRequestItemId === borrowRequestItemId ? updater(item) : item,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRequest) {
      toast.error("Select a borrow request before recording the return.");
      return;
    }

    if (activeItems.length === 0) {
      toast.error("Select at least one item to return.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrowRequestId: selectedRequest.id,
          returnedAt: fromDateTimeLocalValue(returnedAt),
          note: note.trim() || undefined,
          items: activeItems.map((item) => ({
            borrowRequestItemId: item.borrowRequestItemId,
            returnQty: item.returnQty,
            condition: item.condition,
            note: item.note.trim() || undefined,
          })),
        }),
      });

      const result = (await response.json()) as
        | { success: true; data: { id: number } }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to save the return.");
        return;
      }

      toast.success("Return recorded successfully.");
      router.push(`/returns/${result.data.id}`);
      router.refresh();
    } catch {
      toast.error("An error occurred while saving the return.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return <ReturnPermissionDenied />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/returns"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        Back to returns
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={handleSubmit} className="surface-panel surface-section space-y-6">
          <div className="flex flex-col gap-2 border-b pb-5">
            <h1 className="text-2xl font-semibold">Record return</h1>
            <p className="text-sm text-muted-foreground">
              Choose an approved or partially returned request, then record the quantity and
              condition of the items being returned.
            </p>
          </div>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="borrowRequestId">Borrow request</Label>
              <Select
                value={selectedBorrowRequestId}
                onValueChange={(value) => setSelectedBorrowRequestId(value ?? "")}
              >
                <SelectTrigger id="borrowRequestId" className="w-full">
                  <SelectValue placeholder="Select a request" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleRequests.map((request) => (
                    <SelectItem key={request.id} value={String(request.id)}>
                      {request.requestNo} - {request.borrowerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnedAt">Returned at</Label>
              <Input
                id="returnedAt"
                type="datetime-local"
                value={returnedAt}
                onChange={(event) => setReturnedAt(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Transaction note</Label>
              <Input
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note for this return"
              />
            </div>
          </section>

          {selectedRequest ? <ReturnRequestDetails request={selectedRequest} /> : null}

          <ReturnItemsTable
            items={returnItems}
            loading={loadingItems}
            hasSelection={Boolean(selectedBorrowRequestId)}
            onItemChange={updateItem}
          />

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/returns" className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={submitting || activeItems.length === 0 || loadingRequests}
            >
              {submitting ? "Saving..." : "Save return"}
            </Button>
          </div>
        </form>

        <ReturnSummarySidebar
          eligibleRequestCount={eligibleRequests.length}
          activeItemCount={activeItems.length}
          totalQty={totalQty}
          loadingRequests={loadingRequests}
        />
      </div>
    </div>
  );
}
