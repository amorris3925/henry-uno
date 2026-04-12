import { NextRequest, NextResponse } from "next/server";
import { portalApi } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const result = await portalApi<{
      ok: boolean;
      user: {
        id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
        tool_access: string[];
      };
    }>("/portal-api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    if (!result.ok || !result.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true, user: result.user });
    response.headers.set("Set-Cookie", setSessionCookie(result.user));
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
