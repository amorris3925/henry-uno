import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";
import CompetitorDetail from "@/components/CompetitorDetail";

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  let data = null;
  let error = "";

  try {
    data = await portalApi<{
      profile: Record<string, unknown>;
      posts: Record<string, unknown>[];
      analyses: Record<string, unknown>[];
      metrics: Record<string, unknown>[];
      strategy: Record<string, unknown>[];
    }>(`/portal-api/social/competitors/${id}`, {
      userId: user.id,
      userEmail: user.email,
    });
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load competitor";
  }

  return (
    <PortalShell user={user}>
      <div className="mb-4">
        <a
          href="/social"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          &larr; Back to competitors
        </a>
      </div>

      {error || !data ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-12 text-center">
          <p className="text-sm text-[var(--color-error)]">{error || "Competitor not found"}</p>
        </div>
      ) : (
        <CompetitorDetail data={data} />
      )}
    </PortalShell>
  );
}
