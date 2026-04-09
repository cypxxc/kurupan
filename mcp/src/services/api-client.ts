import { BASE_URL, USERNAME, PASSWORD } from "../constants.js";

let sessionCookie: string | null = null;

export class KurupanApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "KurupanApiError";
  }
}

async function login(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new KurupanApiError(
      res.status,
      body?.error?.message ?? `Login failed with status ${res.status}`,
    );
  }

  const raw = res.headers.get("set-cookie");
  if (!raw) {
    throw new KurupanApiError(500, "No session cookie returned from login");
  }

  // Extract only "session=<value>" — strip attributes like "; Path=/; HttpOnly"
  const match = raw.match(/^([^;]+)/);
  if (!match) {
    throw new KurupanApiError(500, "Could not parse session cookie from login response");
  }
  sessionCookie = match[1];
}

export async function apiFetch<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined>,
  retried = false,
): Promise<T> {
  if (!sessionCookie) {
    await login();
  }

  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "" && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Cookie: sessionCookie!,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried) {
    sessionCookie = null;
    return apiFetch(path, method, body, query, true);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } })?.error?.message ??
      res.statusText;
    throw new KurupanApiError(res.status, message, json);
  }

  return (json as { data: T }).data;
}

export function toMcpError(err: unknown): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  if (err instanceof KurupanApiError) {
    let hint = "";
    if (err.status === 401) {
      hint = " Check that KURUPAN_USERNAME and KURUPAN_PASSWORD are correct.";
    } else if (err.status === 403) {
      hint = " The service account may lack the required role (needs staff or admin).";
    } else if (err.status === 404) {
      hint = " Verify the ID exists using the corresponding list tool.";
    } else if (err.status === 409) {
      hint = " A conflict occurred — the resource may already exist.";
    }
    return {
      isError: true,
      content: [{ type: "text", text: `Error ${err.status}: ${err.message}.${hint}` }],
    };
  }
  return {
    isError: true,
    content: [{ type: "text", text: `Unexpected error: ${String(err)}` }],
  };
}
