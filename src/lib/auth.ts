import { cookies } from "next/headers";

export interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  tool_access: string[];
}

const SESSION_COOKIE = "henry_portal_session";

export async function getSession(): Promise<PortalUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(user: PortalUser): string {
  // Returns Set-Cookie header value
  const value = JSON.stringify(user);
  const maxAge = 8 * 60 * 60; // 8 hours
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}
