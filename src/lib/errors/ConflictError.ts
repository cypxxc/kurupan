import { AppError } from "./AppError";

export class ConflictError extends AppError {
  constructor(message = "เกิดความขัดแย้งของข้อมูล", details?: unknown) {
    super(message, "CONFLICT", 409, details);
  }
}
