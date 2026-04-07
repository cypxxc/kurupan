import { AppError } from "./AppError";

export class LegacyIdentityError extends AppError {
  constructor(message = "Legacy identity service is unavailable", details?: unknown) {
    super(message, "LEGACY_IDENTITY_ERROR", 503, details);
  }
}
