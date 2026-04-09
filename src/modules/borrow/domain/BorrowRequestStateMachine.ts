import { ConflictError } from "@/lib/errors";

export type BorrowRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "partially_returned"
  | "returned";

const TRANSITIONS: Record<BorrowRequestStatus, BorrowRequestStatus[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["partially_returned", "returned", "cancelled"],
  partially_returned: ["returned"],
  rejected: [],
  cancelled: [],
  returned: [],
};

export class BorrowRequestStateMachine {
  static assertCanTransition(from: BorrowRequestStatus, to: BorrowRequestStatus): void {
    if (!BorrowRequestStateMachine.canTransition(from, to)) {
      throw new ConflictError(`Cannot transition borrow request from "${from}" to "${to}"`, {
        from,
        to,
      });
    }
  }

  static canTransition(from: BorrowRequestStatus, to: BorrowRequestStatus): boolean {
    if (from === to) {
      return true;
    }

    return TRANSITIONS[from]?.includes(to) ?? false;
  }
}
