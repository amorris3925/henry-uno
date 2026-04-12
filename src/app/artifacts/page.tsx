import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";
import ArtifactCard from "@/components/ArtifactCard";
import type { ArtifactListItem } from "@/lib/types";

export default async function ArtifactsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  let artifacts: ArtifactListItem[] = [];
  try {
    const data = await portalApi<{ artifacts: ArtifactListItem[] }>(
      "/portal-api/artifacts",
      { userId: user.id, userEmail: user.email }
    );
    artifacts = data.artifacts || [];
  } catch {
    // will show empty state
  }

  return (
    <PortalShell user={user}>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Artifacts
        </h1>
        {artifacts.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {artifacts.length} shared with you
          </p>
        )}
      </div>

      {artifacts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-16 text-center">
          <div className="text-[var(--text-muted)] mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            No artifacts have been shared with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {artifacts.map((a) => (
            <ArtifactCard key={a.id} artifact={a} />
          ))}
        </div>
      )}
    </PortalShell>
  );
}
