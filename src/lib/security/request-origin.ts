import { AuthorizationError } from "@/lib/errors";

const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function assertTrustedMutationRequest(request: Request) {
  if (SAFE_HTTP_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");

  if (originHeader) {
    if (originHeader === requestOrigin) {
      return;
    }

    throw new AuthorizationError("Cross-site request blocked", {
      expectedOrigin: requestOrigin,
      receivedOrigin: originHeader,
    });
  }

  const refererHeader = request.headers.get("referer");
  const refererOrigin = refererHeader ? getOrigin(refererHeader) : null;

  if (refererOrigin === requestOrigin) {
    return;
  }

  throw new AuthorizationError("Cross-site request blocked", {
    expectedOrigin: requestOrigin,
    receivedOrigin: refererOrigin,
  });
}
