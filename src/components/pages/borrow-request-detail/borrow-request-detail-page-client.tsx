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
import { BorrowRequestItemsCard } from "@/components/pages/borrow-request-detail/borrow-request-items-card";
import { BorrowRequestLoadingState } from "@/components/pages/borrow-request-detail/borrow-request-loading-state";
import { BorrowRequestOutcomeCard } from "@/components/pages/borrow-request-detail/borrow-request-outcome-card";
import { BorrowRequestTimeline } from "@/components/pages/borrow-request-detail/borrow-request-timeline";
import { useAuth } from "@/lib/auth-context";
import type { HistoryEvent } from "@/types/history";
import {
  isBorrowRequestOverdue,
  type BorrowRequestDetail,
} from "@/types/borrow-requests";

type DialogAction = "approve" | "reject" | "cancel" | null;

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

  const canStaffManage = user?.role === "staff" || user?.role === "admin";

  useEffect(() => {
    async function loadRequest() {
      setLoading(true);

      try {
        const response = await fetch(`/api/borrow-requests/${id}`);
        const result = (await response.json()) as
          | { success: true; data: BorrowRequestDetail }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          toast.error(result.error?.message ?? "Unable to load borrow request.");
          setRequest(null);
          return;
        }

        setRequest(result.data);
      } catch {
        toast.error("An error occurred while loading the request.");
        setRequest(null);
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
        const response = await fetch(`/api/history?${params.toString()}`);
        const result = (await response.json()) as
          | { success: true; data: HistoryEvent[] }
          | { success: false; error?: { message?: string } };

        if (!result.success) {
          setTimeline([]);
          return;
        }

        setTimeline(result.data);
      } catch {
        setTimeline([]);
      } finally {
        setLoadingTimeline(false);
      }
    }

    void Promise.all([loadRequest(), loadTimeline()]);
  }, [id]);

  const canApproveReject = canStaffManage && request?.status === "pending";
  const canCancel =
    request?.status === "pending" &&
    (!!canStaffManage || request?.borrowerExternalUserId === user?.externalUserId);
  const canRecordReturn =
    canStaffManage &&
    (request?.status === "approved" || request?.status === "partially_returned");

  const overdue = useMemo(() => {
    if (!request) {
      return false;
    }

    return isBorrowRequestOverdue(request.status, request.dueDate);
  }, [request]);

  const refreshTimeline = async (requestId: number) => {
    const timelineResponse = await fetch(
      `/api/history?entityType=borrow_request&entityId=${requestId}`,
    );
    const timelineResult = (await timelineResponse.json()) as
      | { success: true; data: HistoryEvent[] }
      | { success: false };

    if (timelineResult.success) {
      setTimeline(timelineResult.data);
    }
  };

  const handleAction = async (reason: string) => {
    if (!request || !dialogAction) {
      return;
    }

    setSubmitting(true);
    const action = dialogAction;

    const body =
      action === "reject"
        ? { rejectionReason: reason }
        : action === "cancel"
          ? { cancelReason: reason }
          : undefined;

    try {
      const response = await fetch(`/api/borrow-requests/${request.id}/${dialogAction}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = (await response.json()) as
        | { success: true; data: BorrowRequestDetail }
        | { success: false; error?: { message?: string } };

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to update this request.");
        return;
      }

      if (action === "approve" && canStaffManage) {
        setDialogAction(null);
        toast.success("Borrow request approved.");
        router.push(getReturnTo(searchParams));
        return;
      }

      setRequest(result.data);
      setDialogAction(null);
      toast.success("Borrow request updated.");
      await refreshTimeline(request.id);
    } catch {
      toast.error("An error occurred while processing the request.");
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
        canCancel={canCancel}
        canRecordReturn={canRecordReturn}
        onApprove={() => setDialogAction("approve")}
        onReject={() => setDialogAction("reject")}
        onCancel={() => setDialogAction("cancel")}
      />

      <BorrowRequestItemsCard request={request} />
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
