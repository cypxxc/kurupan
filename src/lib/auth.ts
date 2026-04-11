import { SignJWT, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { isProductionEnvironment } from "@/lib/env/safety";
import type { ActorContext } from "@/types/auth";

export type SessionUser = ActorContext;

export const SESSION_COOKIE_NAME = "session";

type SessionEnv = Record<string, string | undefined>;

const DEFAULT_SESSION_SECRET_VALUES = new Set([
  "change-me-to-random-64-char-hex",
  "replace-with-random-64-character-secret",
  "changeme",
  "secret",
]);

export function validateSessionConfig(env: SessionEnv = process.env as SessionEnv) {
  const sessionSecret = env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is not set");
  }

  if (
    DEFAULT_SESSION_SECRET_VALUES.has(sessionSecret) ||
    sessionSecret.trim().length < 32
  ) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters and must not use a default placeholder",
    );
  }

  const ttlHours = Number(env.SESSION_TTL_HOURS ?? "8");

  if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
    throw new Error("SESSION_TTL_HOURS must be a positive number");
  }
}

let _encodedSecret: Uint8Array | undefined;

function getSessionSecret() {
  if (_encodedSecret) return _encodedSecret;
  validateSessionConfig();
  _encodedSecret = new TextEncoder().encode(process.env.SESSION_SECRET);
  return _encodedSecret;
}

function getSessionTtlHours() {
  return Number(process.env.SESSION_TTL_HOURS ?? "8");
}

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return acc;
      }

      const name = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      acc[name] = value;
      return acc;
    }, {});
}

export async function signSessionId(sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${getSessionTtlHours()}h`)
    .sign(getSessionSecret());
}

export async function verifySignedSessionId(cookieValue: string) {
  const { payload } = await jwtVerify(cookieValue, getSessionSecret());
  const sessionId = payload.sid;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("Invalid session cookie");
  }

  return sessionId;
}

export function readCookie(request: Request | NextRequest, cookieName: string) {
  const headerValue = request.headers.get("cookie");

  if (!headerValue) {
    return null;
  }

  return parseCookieHeader(headerValue)[cookieName] ?? null;
}

export function readSessionCookie(request: Request | NextRequest) {
  return readCookie(request, SESSION_COOKIE_NAME);
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: getSessionTtlHours() * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: 0,
  });
}
