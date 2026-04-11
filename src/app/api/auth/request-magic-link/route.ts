import { NextRequest, NextResponse } from "next/server";
import { portalApi } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const result = await portalApi("/portal-api/auth/request-magic-link", {
      method: "POST",
      body: { email },
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send magic link";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
