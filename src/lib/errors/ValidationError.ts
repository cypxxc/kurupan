import { AppError } from "./AppError";

export class ValidationError extends AppError {
  constructor(message = "ข้อมูลไม่ถูกต้อง", details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}
