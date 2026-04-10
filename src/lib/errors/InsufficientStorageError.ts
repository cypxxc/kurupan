import { AppError } from "./AppError";

export class InsufficientStorageError extends AppError {
  constructor(message = "Insufficient storage available to save uploaded files", details?: unknown) {
    super(message, "INSUFFICIENT_STORAGE", 507, details);
  }
}
