const API_URL = process.env.NEXT_PUBLIC_HENRY_API_URL || "https://henry.business";
const PORTAL_KEY = process.env.HENRY_API_KEY_PORTAL || "";

interface FetchOptions {
  method?: string;
  body?: unknown;
  userId?: string;
  userEmail?: string;
}

export async function portalApi<T = unknown>(
  path: string,
  opts: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, userId, userEmail } = opts;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${PORTAL_KEY}`,
    "Content-Type": "application/json",
  };
  if (userId) headers["X-Portal-User-ID"] = userId;
  if (userEmail) headers["X-Portal-User-Email"] = userEmail;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }

  return res.json();
}

// Client-side API wrapper (calls Next.js API routes, not Henry directly)
export async function clientApi<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = opts;

  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `Error ${res.status}`);
  }

  return res.json();
}
