import { AppError } from "./AppError";

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", details?: unknown) {
    super(message, "UNAUTHENTICATED", 401, details);
  }
}
