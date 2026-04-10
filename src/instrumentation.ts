import { validateSessionConfig } from "@/lib/auth";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateSessionConfig();
  }
}
