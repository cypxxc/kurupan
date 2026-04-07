import { AppError } from "./AppError";

export class ConflictError extends AppError {
  constructor(message = "Conflict detected", details?: unknown) {
    super(message, "CONFLICT", 409, details);
  }
}
