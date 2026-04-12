import { NextRequest, NextResponse } from "next/server";
import { portalApi } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { token, password, name } = await req.json();
    const result = await portalApi("/portal-api/auth/setup-account", {
      method: "POST",
      body: { token, password, name },
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Account setup failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
