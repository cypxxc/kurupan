import { NextResponse, type NextRequest } from "next/server";

import { clearSessionCookie, readSessionCookie, verifySignedSessionId } from "@/lib/auth";
import { errorResponse } from "@/lib/http/response";

function createLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  loginUrl.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(loginUrl);
  clearSessionCookie(response);
  return response;
}

function createUnauthorizedApiResponse() {
  const response = errorResponse(
    {
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    },
    { status: 401 },
  );

  clearSessionCookie(response);
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/api/auth/login") {
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
