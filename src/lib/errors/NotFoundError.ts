import { AppError } from "./AppError";

export class NotFoundError extends AppError {
  constructor(message = "ไม่พบข้อมูลที่ต้องการ", details?: unknown) {
    super(message, "NOT_FOUND", 404, details);
  }
}
