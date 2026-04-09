"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ActionKind = "approve" | "reject" | "cancel";

const ACTION_CONFIG: Record<
  ActionKind,
  {
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    icon: typeof CheckCircle2;
    requireReason: boolean;
    reasonLabel: string;
    reasonPlaceholder: string;
  }
> = {
  approve: {
    title: "Approve request",
    description:
      "This will reserve stock immediately and move the request out of the pending state.",
    confirmLabel: "Confirm approval",
    confirmVariant: "default",
    icon: CheckCircle2,
    requireReason: false,
    reasonLabel: "",
    reasonPlaceholder: "",
  },
  reject: {
    title: "Reject request",
    description:
      "Add a reason so the requester understands what needs to be corrected before trying again.",
    confirmLabel: "Confirm rejection",
    confirmVariant: "destructive",
    icon: XCircle,
    requireReason: true,
    reasonLabel: "Rejection reason",
    reasonPlaceholder: "Explain why this request is being rejected",
  },
  cancel: {
    title: "Cancel request",
    description:
      "Use this only for requests that are still pending and record the reason for audit purposes.",
    confirmLabel: "Confirm cancellation",
    confirmVariant: "destructive",
    icon: ShieldAlert,
    requireReason: true,
    reasonLabel: "Cancellation reason",
    reasonPlaceholder: "Explain why this request is being cancelled",
  },
};

export function BorrowRequestActionDialog({
  open,
  action,
  requestNo,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  open: boolean;
  action: ActionKind | null;
  requestNo: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");

  const config = useMemo(() => {
    return action ? ACTION_CONFIG[action] : null;
  }, [action]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason("");
    }

    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!config) {
      return;
    }

    if (config.requireReason && reason.trim().length === 0) {
      return;
    }

    await onConfirm(reason.trim());
    setReason("");
  };

  if (!config || !action) {
    return null;
  }

  const Icon = config.icon;
  const reasonMissing = config.requireReason && reason.trim().length === 0;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {requestNo} {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {config.requireReason ? (
          <div className="grid gap-2">
            <Label htmlFor={`reason-${action}`}>{config.reasonLabel}</Label>
            <Textarea
              id={`reason-${action}`}
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={config.reasonPlaceholder}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Close</AlertDialogCancel>
          <Button
            type="button"
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={submitting || reasonMissing}
          >
            {submitting ? "Processing..." : config.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
