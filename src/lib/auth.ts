import { cookies } from "next/headers";
import crypto from "crypto";

export interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  tool_access: string[];
}

const SESSION_COOKIE = "henry_portal_session";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return base64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

// Verify a signed cookie value. Returns the unsigned payload if valid, else null.
function verifySigned(payload: string, signature: string, secret: string): string | null {
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

export async function getSession(): Promise<PortalUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const secret = process.env.HENRY_PORTAL_SESSION_SECRET;
  let payload: string;

  if (secret) {
    // Signed mode: require a valid signature. Unsigned/legacy cookies are
    // rejected (user simply re-logs in).
    const dot = raw.lastIndexOf(".");
    if (dot < 0) return null;
    const body = raw.slice(0, dot);
    const signature = raw.slice(dot + 1);
    const verified = verifySigned(body, signature, secret);
    if (verified === null) return null;
    payload = verified;
  } else {
    // Fallback: no secret configured yet — parse the cookie unsigned so a
    // deploy can't lock everyone out before the env var is set.
    payload = raw;
  }

  try {
    return JSON.parse(decodeURIComponent(payload)) as PortalUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(user: PortalUser): string {
  // Returns Set-Cookie header value
  const value = encodeURIComponent(JSON.stringify(user));
  const secret = process.env.HENRY_PORTAL_SESSION_SECRET;
  // When a secret is configured, append an HMAC-SHA256 signature so the
  // backend-trusted user id can't be forged. Without a secret, fall back to
  // the legacy unsigned cookie.
  const cookieValue = secret ? `${value}.${sign(value, secret)}` : value;
  const maxAge = 8 * 60 * 60; // 8 hours
  return `${SESSION_COOKIE}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}
