import { getServerAuthProviderMode } from "@/lib/auth-provider";
import { NextResponse, type NextRequest } from "next/server";

import { clearSessionCookie, readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import { errorResponse } from "@/lib/http/response";

function createLoginRedirect(request: NextRequest) {
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (getServerAuthProviderMode() === "oidc") {
    const ssoUrl = new URL("/api/auth/sso/start", request.url);
    ssoUrl.searchParams.set("next", nextPath);
    const response = NextResponse.redirect(ssoUrl);
    clearSessionCookie(response);
    return response;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(loginUrl);
  clearSessionCookie(response);
  return response;
}

function createUnauthorizedApiResponse() {
  const response = errorResponse(
    {
      code: "UNAUTHENTICATED",
        message: "กรุณาเข้าสู่ระบบ",
    },
    { status: 401 },
  );

  clearSessionCookie(response);
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/sso/start" ||
    pathname === "/api/auth/sso/callback"
  ) {
    return NextResponse.next();
  }

  const cookieValue = readSessionCookie(request);

  if (!cookieValue) {
    return pathname.startsWith("/api/")
      ? createUnauthorizedApiResponse()
      : createLoginRedirect(request);
  }

  try {
    await verifySignedSessionId(cookieValue);
    return NextResponse.next();
  } catch {
    return pathname.startsWith("/api/")
      ? createUnauthorizedApiResponse()
      : createLoginRedirect(request);
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/assets/:path*",
    "/borrow-requests/:path*",
    "/returns/:path*",
    "/history/:path*",
    "/users/:path*",
  ],
};
