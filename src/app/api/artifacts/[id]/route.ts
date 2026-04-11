import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await portalApi(`/portal-api/artifacts/${id}`, {
      userId: user.id,
      userEmail: user.email,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch artifact";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
