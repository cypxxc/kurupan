"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { toast } from "sonner";

import { BorrowRequestActionDialog } from "@/components/shared/borrow-request-action-dialog";
import { BorrowRequestEmptyState } from "@/components/pages/borrow-request-detail/borrow-request-empty-state";
import { BorrowRequestHeader } from "@/components/pages/borrow-request-detail/borrow-request-header";
import {
  BorrowRequestItemsCard,
  type BorrowRequestApprovalItem,
} from "@/components/pages/borrow-request-detail/borrow-request-items-card";
import { BorrowRequestLoadingState } from "@/components/pages/borrow-request-detail/borrow-request-loading-state";
import { BorrowRequestOutcomeCard } from "@/components/pages/borrow-request-detail/borrow-request-outcome-card";
import { BorrowRequestTimeline } from "@/components/pages/borrow-request-detail/borrow-request-timeline";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { HistoryEvent } from "@/types/history";
import { isBorrowRequestOverdue, type BorrowRequestDetail } from "@/types/borrow-requests";

type DialogAction = "reject" | "cancel" | "followUp" | null;

function createApprovalItems(
  items: BorrowRequestDetail["items"],
): BorrowRequestApprovalItem[] {
  return items.map((item) => ({
    borrowRequestItemId: item.id,
    selected: true,
    approvedQty: item.requestedQty,
  }));
}

function getReturnTo(searchParams: ReadonlyURLSearchParams) {
  const returnTo = searchParams.get("returnTo");

  if (!returnTo || !returnTo.startsWith("/")) {
    return "/borrow-requests";
  }

  return returnTo;
}

export function BorrowRequestDetailPageClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [request, setRequest] = useState<BorrowRequestDetail | null>(null);
  const [timeline, setTimeline] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvalItems, setApprovalItems] = useState<BorrowRequestApprovalItem[]>([]);

  const canStaffManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    async function loadRequest() {
      setLoading(true);

      try {
        const data = await apiClient.get<BorrowRequestDetail>(`/api/borrow-requests/${id}`);
        setRequest(data);
        setApprovalItems(createApprovalItems(data.items));
      } catch (error) {
        toast.error(getApiErrorMessage(error, "An error occurred while loading the request."));
        setRequest(null);
        setApprovalItems([]);
      } finally {
        setLoading(false);
      }
    }

    async function loadTimeline() {
      setLoadingTimeline(true);

      try {
        const params = new URLSearchParams({
          entityType: "borrow_request",
          entityId: id,
        });
        const data = await apiClient.get<HistoryEvent[]>("/api/history", { query: params });
        setTimeline(data);
      } catch {
        setTimeline([]);
      } finally {
        setLoadingTimeline(false);
      }
    }

    void Promise.all([loadRequest(), loadTimeline()]);
  }, [id]);

  const canApproveReject = canStaffManage && request?.status === "pending";
  const selectedApprovalCount = approvalItems.filter((item) => item.selected).length;
  const selectedApprovedQty = approvalItems
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.approvedQty, 0);
  const canApproveSelected =
    canApproveReject && selectedApprovalCount > 0 && selectedApprovedQty > 0;
  const canCancel =
    request?.status === "pending" &&
    (!!canStaffManage || request?.borrowerExternalUserId === user?.externalUserId);
  const remainingFollowUpItems = useMemo(() => {
    if (!request) {
      return [];
    }

    return request.items
      .map((item) => ({
        ...item,
        remainingQty: Math.max(0, item.requestedQty - (item.approvedQty ?? 0)),
      }))
      .filter((item) => item.remainingQty > 0);
  }, [request]);
  const canCreateFollowUp =
    request?.status === "partially_approved" &&
    request.borrowerExternalUserId === user?.externalUserId &&
    remainingFollowUpItems.length > 0;
  const canRecordReturn =
    canStaffManage &&
    (request?.status === "approved" ||
      request?.status === "partially_approved" ||
      request?.status === "partially_returned");

  const overdue = useMemo(() => {
    if (!request) {
      return false;
    }

    return isBorrowRequestOverdue(request.status, request.dueDate);
  }, [request]);

  const refreshTimeline = async (requestId: number) => {
    try {
      const data = await apiClient.get<HistoryEvent[]>("/api/history", {
        query: { entityType: "borrow_request", entityId: requestId },
      });
      setTimeline(data);
    } catch {
      setTimeline([]);
    }
  };

  const handleApproveSelected = async () => {
    if (!request || !canStaffManage || !canApproveReject) {
      return;
    }

    setSubmitting(true);

    try {
      const data = await apiClient.post<BorrowRequestDetail>(
        `/api/borrow-requests/${request.id}/approve`,
        {
        body: JSON.stringify({
          items: request.items.map((item) => {
            const approval = approvalItems.find(
              (candidate) => candidate.borrowRequestItemId === item.id,
            );

            return {
              borrowRequestItemId: item.id,
              approvedQty: approval?.selected ? approval.approvedQty : 0,
            };
          }),
        }),
      },
      );

      toast.success(
        data.status === "partially_approved"
          ? "Borrow request partially approved."
          : "Borrow request approved.",
      );
      router.push(getReturnTo(searchParams));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "An error occurred while processing the request."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (reason: string) => {
    if (!request || !dialogAction) {
      return;
    }

    setSubmitting(true);
    const body =
      dialogAction === "reject"
        ? { rejectionReason: reason }
        : dialogAction === "cancel"
          ? { cancelReason: reason }
          : undefined;

    try {
      if (dialogAction === "followUp") {
        const data = await apiClient.post<BorrowRequestDetail>(
          `/api/borrow-requests/${request.id}/follow-up`,
        );

        setDialogAction(null);
        toast.success("Created a follow-up borrow request.");
        router.push(`/borrow-requests/${data.id}`);
        return;
      }

      const data = await apiClient.post<BorrowRequestDetail>(
        `/api/borrow-requests/${request.id}/${dialogAction}`,
        {
          body: body ? JSON.stringify(body) : undefined,
        },
      );

      setRequest(data);
      setApprovalItems(createApprovalItems(data.items));
      setDialogAction(null);
      toast.success("Borrow request updated.");
      await refreshTimeline(request.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "An error occurred while processing the request."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <BorrowRequestLoadingState />;
  }

  if (!request) {
    return <BorrowRequestEmptyState />;
  }

  return (
    <div className="space-y-6">
      <BorrowRequestHeader
        request={request}
        overdue={overdue}
        canApproveReject={canApproveReject}
        canApproveSelected={Boolean(canApproveSelected) && !submitting}
        selectedApprovalCount={selectedApprovalCount}
        canCancel={canCancel}
        canRecordReturn={canRecordReturn}
        remainingFollowUpCount={canCreateFollowUp ? remainingFollowUpItems.length : 0}
        onApproveSelected={handleApproveSelected}
        onCreateFollowUp={() => setDialogAction("followUp")}
        onReject={() => setDialogAction("reject")}
        onCancel={() => setDialogAction("cancel")}
      />

      <BorrowRequestItemsCard
        request={request}
        editable={Boolean(canApproveReject)}
        approvalItems={approvalItems}
        onApprovalItemChange={(borrowRequestItemId, updater) =>
          setApprovalItems((current) =>
            current.map((item) =>
              item.borrowRequestItemId === borrowRequestItemId ? updater(item) : item,
            ),
          )
        }
        onToggleAll={(checked) =>
          setApprovalItems((current) =>
            current.map((item) => ({
              ...item,
              selected: checked,
              approvedQty: checked ? Math.max(1, item.approvedQty || 1) : item.approvedQty,
            })),
          )
        }
      />
      <BorrowRequestOutcomeCard request={request} />
      <BorrowRequestTimeline loading={loadingTimeline} timeline={timeline} />

      <BorrowRequestActionDialog
        open={dialogAction !== null}
        action={dialogAction}
        requestNo={request.requestNo}
        onOpenChange={(open) => {
          if (!open) {
            setDialogAction(null);
          }
        }}
        onConfirm={handleAction}
        submitting={submitting}
      />
    </div>
  );
}
