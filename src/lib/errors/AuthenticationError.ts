import { AppError } from "./AppError";

export class AuthenticationError extends AppError {
  constructor(message = "กรุณาเข้าสู่ระบบ", details?: unknown) {
    super(message, "UNAUTHENTICATED", 401, details);
  }
}
