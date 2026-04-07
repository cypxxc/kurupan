import type { NextRequest } from "next/server";
import { z, type ZodType } from "zod";

import { ValidationError } from "@/lib/errors";

function formatIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown, message?: string): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ValidationError(message, {
      issues: formatIssues(result.error.issues),
    });
  }

  return result.data;
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  return parseWithSchema(schema, payload, "Request body validation failed");
}

export async function parseOptionalJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const rawBody = await request.text();

  if (rawBody.trim().length === 0) {
    return parseWithSchema(schema, {}, "Request body validation failed");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  return parseWithSchema(schema, payload, "Request body validation failed");
}

export function parseSearchParams<T>(
  requestOrSearchParams: NextRequest | URLSearchParams,
  schema: ZodType<T>,
): T {
  const searchParams =
    requestOrSearchParams instanceof URLSearchParams
      ? requestOrSearchParams
      : requestOrSearchParams.nextUrl.searchParams;

  return parseWithSchema(
    schema,
    Object.fromEntries(searchParams.entries()),
    "Query string validation failed",
  );
}

export async function parseRouteParams<T>(
  paramsPromise: Promise<Record<string, string | string[] | undefined>>,
  schema: ZodType<T>,
): Promise<T> {
  return parseWithSchema(
    schema,
    await paramsPromise,
    "Route parameter validation failed",
  );
}

export const positiveIntegerIdSchema = z.coerce.number().int().positive();
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Invalid date");
