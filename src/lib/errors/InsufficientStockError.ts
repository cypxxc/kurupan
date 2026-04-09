import { AppError } from "./AppError";

export class InsufficientStockError extends AppError {
  constructor(message = "จำนวนคงเหลือไม่เพียงพอ", details?: unknown) {
    super(message, "INSUFFICIENT_STOCK", 409, details);
  }
}
