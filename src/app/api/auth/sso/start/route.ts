import { NextResponse, type NextRequest } from "next/server";

import { getServerAuthProviderMode } from "@/lib/auth-provider";
import {
  buildOidcAuthorizationUrl,
  buildOidcRedirectUri,
  fetchOidcDiscoveryDocument,
  generateOidcTransaction,
  getOidcConfig,
  setOidcTransactionCookie,
  signOidcTransactionCookie,
} from "@/lib/oidc";

export async function GET(request: NextRequest) {
  if (getServerAuthProviderMode() !== "oidc") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const config = getOidcConfig();
  const discovery = await fetchOidcDiscoveryDocument(config.issuer);
  const nextPath = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const transaction = generateOidcTransaction(nextPath);
  const redirectUri = buildOidcRedirectUri(request);
  const cookieValue = await signOidcTransactionCookie(transaction);
  const authorizationUrl = buildOidcAuthorizationUrl({
    discovery,
    config,
    redirectUri,
    transaction,
  });

  const response = NextResponse.redirect(authorizationUrl);
  setOidcTransactionCookie(response, cookieValue);
  return response;
}
