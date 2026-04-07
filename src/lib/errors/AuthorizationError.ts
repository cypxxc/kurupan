import { AppError } from "./AppError";

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action", details?: unknown) {
    super(message, "FORBIDDEN", 403, details);
  }
}
