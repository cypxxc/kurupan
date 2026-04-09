import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { todayString } from "@/components/pages/borrow-requests-new/borrow-request-form-helpers";
import type { BorrowRequestFormItem } from "@/types/borrow-requests";

type BorrowRequestDraft = {
  items: BorrowRequestFormItem[];
  purpose: string;
  startDate: string;
  dueDate: string;
};

const STORAGE_KEY = "borrow-request-draft";

function isBorrowRequestDraft(value: unknown): value is BorrowRequestDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<BorrowRequestDraft>;
  return (
    Array.isArray(draft.items) &&
    typeof draft.purpose === "string" &&
    typeof draft.startDate === "string" &&
    typeof draft.dueDate === "string"
  );
}

export function readDraft(): BorrowRequestDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedDraft = window.localStorage.getItem(STORAGE_KEY);
    if (!storedDraft) {
      return null;
    }

    const parsedDraft: unknown = JSON.parse(storedDraft);
    return isBorrowRequestDraft(parsedDraft) ? parsedDraft : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: BorrowRequestDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {}
}

export function removeDraft() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function useBorrowRequestDraft() {
  const hasShownRestoreToastRef = useRef(false);
  const [restoredDraft] = useState<BorrowRequestDraft | null>(() => readDraft());
  const [items, setItems] = useState(() => restoredDraft?.items ?? []);
  const [purpose, setPurpose] = useState(() => restoredDraft?.purpose ?? "");
  const [startDate, setStartDate] = useState(() => restoredDraft?.startDate ?? todayString());
  const [dueDate, setDueDate] = useState(() => restoredDraft?.dueDate ?? todayString());

  useEffect(() => {
    if (hasShownRestoreToastRef.current || !restoredDraft) {
      return;
    }

    hasShownRestoreToastRef.current = true;

    if (restoredDraft.items.length > 0 || restoredDraft.purpose.trim().length > 0) {
      toast.success("ดึงข้อมูลแบบร่างกลับมาแล้ว");
    }
  }, [restoredDraft]);

  useEffect(() => {
    writeDraft({
      items,
      purpose,
      startDate,
      dueDate,
    });
  }, [dueDate, items, purpose, startDate]);

  return {
    items,
    setItems,
    purpose,
    setPurpose,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    clearDraft: removeDraft,
  };
}
