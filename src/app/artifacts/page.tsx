import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";
import ArtifactsBrowser from "@/components/ArtifactsBrowser";
import type { ArtifactListItem } from "@/lib/types";

export default async function ArtifactsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  let artifacts: ArtifactListItem[] = [];
  let loadError = false;
  try {
    const data = await portalApi<{ artifacts: ArtifactListItem[] }>(
      "/portal-api/artifacts",
      { userId: user.id, userEmail: user.email }
    );
    // Fathom recaps live under /recaps as a separate tab.
    artifacts = (data.artifacts || []).filter((a) => a.artifact_type !== "fathom_recap");
  } catch {
    loadError = true;
  }

  return (
    <PortalShell user={user}>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Artifacts
        </h1>
        {!loadError && artifacts.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {artifacts.length} shared with you
          </p>
        )}
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-16 text-center">
          <div className="text-red-400 mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-70">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Couldn&apos;t load your artifacts — please refresh or try again.
          </p>
          <a
            href="/artifacts"
            className="mt-4 inline-block text-xs text-[var(--color-accent)] hover:underline"
          >
            Refresh
          </a>
        </div>
      ) : artifacts.length === 0 ? (
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
        <ArtifactsBrowser artifacts={artifacts} />
      )}
    </PortalShell>
  );
}
