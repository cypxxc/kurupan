"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { ReturnItemsTable } from "@/components/pages/returns-new/return-items-table";
import { ReturnPermissionDenied } from "@/components/pages/returns-new/return-permission-denied";
import { ReturnRequestDetails } from "@/components/pages/returns-new/return-request-details";
import { ReturnSummarySidebar } from "@/components/pages/returns-new/return-summary-sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
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
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  type ReturnPreparationData,
  type ReturnFormItem,
} from "@/types/returns";

export function NewReturnPageClient() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [eligibleRequests, setEligibleRequests] = useState<
    ReturnPreparationData["eligibleRequests"]
  >([]);
  const [selectedBorrowRequestId, setSelectedBorrowRequestId] = useState(
    () => searchParams.get("borrowRequestId") ?? "",
  );
  const [selectedRequest, setSelectedRequest] = useState<ReturnPreparationData["selectedRequest"]>(
    null,
  );
  const [returnItems, setReturnItems] = useState<ReturnFormItem[]>([]);
  const [note, setNote] = useState("");
  const [returnedAt, setReturnedAt] = useState(toDateTimeLocalValue());
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedPreparationRef = useRef(false);

  const canManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    setSelectedBorrowRequestId(searchParams.get("borrowRequestId") ?? "");
  }, [searchParams]);

  useEffect(() => {
    async function loadPreparationData() {
      const loadingSelection = hasLoadedPreparationRef.current;
      setLoadingRequests(!loadingSelection);
      setLoadingItems(loadingSelection);

      try {
        const data = await apiClient.get<ReturnPreparationData>("/api/returns/new-data", {
          query: selectedBorrowRequestId
            ? { borrowRequestId: selectedBorrowRequestId }
            : undefined,
        });

        setEligibleRequests(data.eligibleRequests);
        setSelectedRequest(data.selectedRequest);
        setReturnItems(data.returnItems);
        hasLoadedPreparationRef.current = true;
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            loadingSelection
              ? t("returnsNew.loadItemsError")
              : t("returnsNew.loadEligibleError"),
          ),
        );
        if (!loadingSelection) {
          setEligibleRequests([]);
        }
        setSelectedRequest(null);
        setReturnItems([]);
      } finally {
        setLoadingRequests(false);
        setLoadingItems(false);
      }
    }

    if (canManage) {
      void loadPreparationData();
    } else {
      setLoadingRequests(false);
      setLoadingItems(false);
    }
  }, [canManage, selectedBorrowRequestId, t]);

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
      toast.error(t("returnsNew.selectRequest"));
      return;
    }

    if (activeItems.length === 0) {
      toast.error(t("returnsNew.selectItem"));
      return;
    }

    setSubmitting(true);

    try {
      const data = await apiClient.post<{ id: number }>("/api/returns", {
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

      toast.success(t("returnsNew.created"));
      router.push(`/returns/${data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("returnsNew.saveError")));
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
        prefetch={false}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
      >
        <ArrowLeft className="size-4" />
        {t("returnsNew.back")}
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={handleSubmit} className="surface-panel surface-section space-y-6">
          <div className="flex flex-col gap-2 border-b pb-5">
            <h1 className="text-2xl font-semibold">{t("returnsNew.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("returnsNew.description")}</p>
            <p className="text-sm text-muted-foreground">{t("returnsNew.description2")}</p>
          </div>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="borrowRequestId">{t("returnsNew.labels.borrowRequest")}</Label>
              <Select
                value={selectedBorrowRequestId}
                onValueChange={(value) => setSelectedBorrowRequestId(value ?? "")}
              >
                <SelectTrigger id="borrowRequestId" className="w-full">
                  <SelectValue placeholder={t("returnsNew.placeholders.selectRequest")} />
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
              <Label htmlFor="returnedAt">{t("returnsNew.labels.returnedAt")}</Label>
              <Input
                id="returnedAt"
                type="datetime-local"
                value={returnedAt}
                onChange={(event) => setReturnedAt(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{t("returnsNew.labels.note")}</Label>
              <Input
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("returnsNew.placeholders.note")}
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
            <Link href="/returns" prefetch={false} className={buttonVariants({ variant: "outline" })}>
              {t("returnsNew.actions.cancel")}
            </Link>
            <Button
              type="submit"
              disabled={submitting || activeItems.length === 0 || loadingRequests}
            >
              {submitting ? t("returnsNew.actions.saving") : t("returnsNew.actions.save")}
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
