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
    title: "อนุมัติคำขอ",
    description:
      "ระบบจะตัด stock ตามจำนวนที่อนุมัติทันที และคำขอนี้จะไม่กลับไปเป็นสถานะรออนุมัติอีก",
    confirmLabel: "ยืนยันการอนุมัติ",
    confirmVariant: "default",
    icon: CheckCircle2,
    requireReason: false,
    reasonLabel: "",
    reasonPlaceholder: "",
  },
  reject: {
    title: "ปฏิเสธคำขอ",
    description:
      "กรุณาระบุเหตุผลให้ผู้ขอทราบ เพื่อใช้ประกอบการแก้ไขหรือส่งคำขอใหม่",
    confirmLabel: "ยืนยันการปฏิเสธ",
    confirmVariant: "destructive",
    icon: XCircle,
    requireReason: true,
    reasonLabel: "เหตุผลที่ปฏิเสธ",
    reasonPlaceholder: "ระบุเหตุผลที่ปฏิเสธคำขอนี้",
  },
  cancel: {
    title: "ยกเลิกคำขอ",
    description:
      "ใช้สำหรับคำขอที่ยังอยู่ในสถานะรออนุมัติเท่านั้น และควรบันทึกสาเหตุไว้เพื่อให้ตรวจสอบย้อนหลังได้",
    confirmLabel: "ยืนยันการยกเลิก",
    confirmVariant: "destructive",
    icon: ShieldAlert,
    requireReason: true,
    reasonLabel: "เหตุผลที่ยกเลิก",
    reasonPlaceholder: "ระบุเหตุผลที่ยกเลิกคำขอนี้",
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
          <AlertDialogCancel disabled={submitting}>ปิด</AlertDialogCancel>
          <Button
            type="button"
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={submitting || reasonMissing}
          >
            {submitting ? "กำลังดำเนินการ..." : config.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
