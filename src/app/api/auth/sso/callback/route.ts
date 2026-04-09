import { NextResponse, type NextRequest } from "next/server";

import { getServerAuthProviderMode } from "@/lib/auth-provider";
import { clearSessionCookie, setSessionCookie, signSessionId } from "@/lib/auth";
import { createAuthStack } from "@/modules/auth/createAuthStack";
import {
  buildOidcRedirectUri,
  clearOidcTransactionCookie,
  exchangeOidcAuthorizationCode,
  fetchOidcDiscoveryDocument,
  getOidcConfig,
  mapOidcPayloadToIdentity,
  readOidcTransactionCookie,
  verifyOidcIdToken,
  verifyOidcTransactionCookie,
} from "@/lib/oidc";

function createLoginRedirect(
  request: NextRequest,
  message: string,
  clearSession = false,
) {
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("error", message);
  const response = NextResponse.redirect(redirectUrl);
  clearOidcTransactionCookie(response);

  if (clearSession) {
    clearSessionCookie(response);
  }

  return response;
}

export async function GET(request: NextRequest) {
  if (getServerAuthProviderMode() !== "oidc") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return createLoginRedirect(request, error);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const transactionCookie = readOidcTransactionCookie(request);

  if (!code || !state || !transactionCookie) {
    return createLoginRedirect(request, "SSO callback is missing required parameters");
  }

  try {
    const transaction = await verifyOidcTransactionCookie(transactionCookie);

    if (transaction.state !== state) {
      return createLoginRedirect(request, "Invalid SSO state");
    }

    const config = getOidcConfig();
    const discovery = await fetchOidcDiscoveryDocument(config.issuer);
    const redirectUri = buildOidcRedirectUri(request);
    const tokenResult = await exchangeOidcAuthorizationCode({
      discovery,
      config,
      code,
      redirectUri,
      codeVerifier: transaction.codeVerifier,
    });

    if (!tokenResult.id_token) {
      return createLoginRedirect(request, "OIDC provider did not return id_token");
    }

    const payload = await verifyOidcIdToken({
      discovery,
      config,
      idToken: tokenResult.id_token,
      nonce: transaction.nonce,
    });
    const identity = mapOidcPayloadToIdentity(payload, config);
    const { authService } = createAuthStack();
    const result = await authService.loginWithExternalIdentity(identity);
    const signedSessionId = await signSessionId(result.sessionId);
    const nextUrl = new URL(transaction.nextPath || "/dashboard", request.url);
    const response = NextResponse.redirect(nextUrl);

    clearOidcTransactionCookie(response);
    setSessionCookie(response, signedSessionId);

    return response;
  } catch (callbackError) {
    const message =
      callbackError instanceof Error ? callbackError.message : "SSO login failed";
    return createLoginRedirect(request, message, true);
  }
}
