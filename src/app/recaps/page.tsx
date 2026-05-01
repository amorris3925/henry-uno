import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";
import ArtifactCard from "@/components/ArtifactCard";
import type { ArtifactListItem } from "@/lib/types";

export default async function RecapsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  let recaps: ArtifactListItem[] = [];
  try {
    const data = await portalApi<{ artifacts: ArtifactListItem[] }>(
      "/portal-api/artifacts?type=fathom_recap",
      { userId: user.id, userEmail: user.email }
    );
    recaps = data.artifacts || [];
  } catch {
    // empty state
  }

  return (
    <PortalShell user={user}>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Fathom Recaps
        </h1>
        {recaps.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {recaps.length} meeting{recaps.length === 1 ? "" : "s"} shared with you
          </p>
        )}
      </div>

      {recaps.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-16 text-center">
          <div className="text-[var(--text-muted)] mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            No meeting recaps shared with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {recaps.map((a) => (
            <ArtifactCard key={a.id} artifact={a} />
          ))}
        </div>
      )}
    </PortalShell>
  );
}
