import { AppError } from "./AppError";

export class AuthorizationError extends AppError {
  constructor(message = "คุณไม่มีสิทธิ์ดำเนินการนี้", details?: unknown) {
    super(message, "FORBIDDEN", 403, details);
  }
}
