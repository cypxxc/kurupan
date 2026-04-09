import { AppError } from "./AppError";

export class ReturnExceedsApprovedError extends AppError {
  constructor(message = "จำนวนที่คืนเกินจำนวนที่อนุมัติ", details?: unknown) {
    super(message, "RETURN_EXCEEDS_APPROVED", 409, details);
  }
}
