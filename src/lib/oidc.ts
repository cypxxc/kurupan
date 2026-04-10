import { createHash, randomBytes } from "node:crypto";

import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { JWTPayload } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { readCookie } from "@/lib/auth";
import { parseWithSchema } from "@/lib/validators/http";
import {
  oidcDiscoveryDocumentSchema,
  oidcTokenResponseSchema,
  oidcTransactionPayloadSchema,
  type OidcDiscoveryDocument,
  type OidcTokenResponse,
  type OidcTransactionPayload,
} from "@/lib/validators/oidc";

export const OIDC_TRANSACTION_COOKIE_NAME = "oidc_tx";

export type OidcIdentity = {
  externalUserId: string;
  fullName?: string;
  email?: string | null;
  employeeCode?: string | null;
  department?: string | null;
};

type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  scopes: string;
  externalIdClaim: string;
  fullNameClaim: string;
  emailClaim: string;
  employeeCodeClaim: string;
  departmentClaim: string;
};

function sanitizeNextPath(nextPath: string) {
  return nextPath.startsWith("/") ? nextPath : "/dashboard";
}

function getSessionSecret() {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is not set");
  }

  return new TextEncoder().encode(sessionSecret);
}

function toBase64Url(input: Buffer | Uint8Array) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

function readClaimValue(payload: JWTPayload, claimName: string): string | null {
  const value = payload[claimName];

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

export function getOidcConfig(): OidcConfig {
  return {
    issuer: getRequiredEnv("OIDC_ISSUER_URL"),
    clientId: getRequiredEnv("OIDC_CLIENT_ID"),
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    scopes: process.env.OIDC_SCOPES ?? "openid profile email",
    externalIdClaim: process.env.OIDC_EXTERNAL_ID_CLAIM ?? "preferred_username",
    fullNameClaim: process.env.OIDC_FULL_NAME_CLAIM ?? "name",
    emailClaim: process.env.OIDC_EMAIL_CLAIM ?? "email",
    employeeCodeClaim: process.env.OIDC_EMPLOYEE_CODE_CLAIM ?? "employee_code",
    departmentClaim: process.env.OIDC_DEPARTMENT_CLAIM ?? "department",
  };
}

export async function fetchOidcDiscoveryDocument(issuer: string) {
  const discoveryUrl = new URL("/.well-known/openid-configuration", issuer);
  const response = await fetch(discoveryUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load OIDC discovery document");
  }

  return parseWithSchema(
    oidcDiscoveryDocumentSchema,
    await response.json(),
    "Invalid OIDC discovery document",
  );
}

export function buildOidcRedirectUri(request: Request | NextRequest) {
  if (process.env.OIDC_REDIRECT_URI) {
    return process.env.OIDC_REDIRECT_URI;
  }

  return new URL("/api/auth/sso/callback", request.url).toString();
}

export function generateOidcTransaction(nextPath: string) {
  return {
    state: randomBytes(24).toString("hex"),
    nonce: randomBytes(24).toString("hex"),
    codeVerifier: toBase64Url(randomBytes(32)),
    nextPath: sanitizeNextPath(nextPath),
  };
}

export function createCodeChallenge(codeVerifier: string) {
  return toBase64Url(createHash("sha256").update(codeVerifier).digest());
}

export async function signOidcTransactionCookie(payload: OidcTransactionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSessionSecret());
}

export async function verifyOidcTransactionCookie(cookieValue: string) {
  const { payload } = await jwtVerify(cookieValue, getSessionSecret());
  const transaction = parseWithSchema(
    oidcTransactionPayloadSchema,
    payload,
    "Invalid OIDC transaction cookie",
  );

  return {
    ...transaction,
    nextPath: sanitizeNextPath(transaction.nextPath),
  };
}

export function readOidcTransactionCookie(request: Request | NextRequest) {
  return readCookie(request, OIDC_TRANSACTION_COOKIE_NAME);
}

export function setOidcTransactionCookie(response: NextResponse, value: string) {
  response.cookies.set(OIDC_TRANSACTION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export function clearOidcTransactionCookie(response: NextResponse) {
  response.cookies.set(OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function buildOidcAuthorizationUrl(params: {
  discovery: OidcDiscoveryDocument;
  config: OidcConfig;
  redirectUri: string;
  transaction: OidcTransactionPayload;
}) {
  const codeChallenge = createCodeChallenge(params.transaction.codeVerifier);
  const url = new URL(params.discovery.authorization_endpoint);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.config.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.config.scopes);
  url.searchParams.set("state", params.transaction.state);
  url.searchParams.set("nonce", params.transaction.nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url;
}

export async function exchangeOidcAuthorizationCode(params: {
  discovery: OidcDiscoveryDocument;
  config: OidcConfig;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.config.clientId,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  if (params.config.clientSecret) {
    body.set("client_secret", params.config.clientSecret);
  }

  const response = await fetch(params.discovery.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("OIDC token exchange failed");
  }

  return parseWithSchema(
    oidcTokenResponseSchema,
    await response.json(),
    "Invalid OIDC token response",
  ) satisfies OidcTokenResponse;
}

export async function verifyOidcIdToken(params: {
  discovery: OidcDiscoveryDocument;
  config: OidcConfig;
  idToken: string;
  nonce: string;
}) {
  const jwks = createRemoteJWKSet(new URL(params.discovery.jwks_uri));
  const { payload } = await jwtVerify(params.idToken, jwks, {
    issuer: params.discovery.issuer,
    audience: params.config.clientId,
  });

  if (payload.nonce !== params.nonce) {
    throw new Error("OIDC nonce mismatch");
  }

  return payload;
}

export function mapOidcPayloadToIdentity(payload: JWTPayload, config: OidcConfig): OidcIdentity {
  const externalUserId =
    readClaimValue(payload, config.externalIdClaim) ??
    readClaimValue(payload, "sub");

  if (!externalUserId) {
    throw new Error("OIDC payload is missing an external user identifier");
  }

  return {
    externalUserId,
    fullName: readClaimValue(payload, config.fullNameClaim) ?? externalUserId,
    email: readClaimValue(payload, config.emailClaim),
    employeeCode: readClaimValue(payload, config.employeeCodeClaim),
    department: readClaimValue(payload, config.departmentClaim),
  };
}
