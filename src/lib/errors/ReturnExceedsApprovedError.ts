import { AppError } from "./AppError";

export class ReturnExceedsApprovedError extends AppError {
  constructor(message = "Returned quantity exceeds approved quantity", details?: unknown) {
    super(message, "RETURN_EXCEEDS_APPROVED", 409, details);
  }
}
