import { AppError } from "./AppError";

export class InsufficientStockError extends AppError {
  constructor(message = "Insufficient stock", details?: unknown) {
    super(message, "INSUFFICIENT_STOCK", 409, details);
  }
}
