import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await portalApi("/portal-api/social/competitors", {
      userId: user.id,
      userEmail: user.email,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch competitors";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
