import type { ApiErrorResponse, ApiSuccessResponse } from "@/lib/http/response";

type PrimitiveQueryValue = string | number | boolean;
type QueryValue =
  | PrimitiveQueryValue
  | null
  | undefined
  | Array<PrimitiveQueryValue | null | undefined>;

type QueryParams = Record<string, QueryValue> | URLSearchParams;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  query?: QueryParams;
  body?: BodyInit | Record<string, unknown> | undefined;
  parseAs?: "json" | "void";
};

type ApiRequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function appendQueryValue(params: URLSearchParams, key: string, value: QueryValue) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry !== undefined && entry !== null) {
        params.append(key, String(entry));
      }
    }
    return;
  }

  params.set(key, String(value));
}

export function buildApiUrl(path: string, query?: QueryParams) {
  if (!query) {
    return path;
  }

  const params = query instanceof URLSearchParams ? new URLSearchParams(query) : new URLSearchParams();

  if (!(query instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(query)) {
      appendQueryValue(params, key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function parseApiPayload<T>(response: Response): Promise<ApiSuccessResponse<T> | ApiErrorResponse | null> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;
}

function normalizeBody(body: ApiRequestOptions["body"], headers: Headers) {
  if (body === undefined) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream
  ) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

export async function apiRequest<T>(
  method: ApiRequestMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers: initHeaders, query, parseAs = "json", ...init } = options;
  const headers = new Headers(initHeaders);
  const response = await fetch(buildApiUrl(path, query), {
    ...init,
    method,
    headers,
    body: normalizeBody(body, headers),
  });

  if (parseAs === "void") {
    if (!response.ok) {
      throw new ApiClientError(response.statusText || "Request failed", undefined, response.status);
    }

    return undefined as T;
  }

  const payload = await parseApiPayload<T>(response);

  if (payload?.success) {
    return payload.data;
  }

  if (payload && !payload.success) {
    throw new ApiClientError(
      payload.error.message,
      payload.error.code,
      response.status,
      payload.error.details,
    );
  }

  throw new ApiClientError(response.statusText || "Request failed", undefined, response.status);
}

export const apiClient = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
    return apiRequest<T>("GET", path, options);
  },
  post<T>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>("POST", path, options);
  },
  patch<T>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>("PATCH", path, options);
  },
  put<T>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>("PUT", path, options);
  },
  delete<T>(path: string, options?: Omit<ApiRequestOptions, "body">) {
    return apiRequest<T>("DELETE", path, options);
  },
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.message) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
