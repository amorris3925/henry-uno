import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";
import ArtifactViewer from "@/components/ArtifactViewer";
import CommentsPanel from "@/components/CommentsPanel";
import type { Artifact } from "@/lib/types";

export default async function RecapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;

  let artifact: Artifact | null = null;
  let error = "";

  try {
    artifact = await portalApi<Artifact>(
      `/portal-api/artifacts/${id}`,
      { userId: user.id, userEmail: user.email }
    );
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load recap";
  }

  return (
    <PortalShell user={user}>
      <div className="mb-4">
        <a
          href="/recaps"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          &larr; Back to recaps
        </a>
      </div>

      {error || !artifact ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-12 text-center">
          <p className="text-sm text-[var(--color-error)]">{error || "Recap not found"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {artifact.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">
                fathom recap
              </span>
              <span>{new Date(artifact.created_at).toLocaleDateString()}</span>
            </div>
            {artifact.summary && (
              <p className="text-sm text-[var(--text-secondary)] mt-3">{artifact.summary}</p>
            )}
          </div>

          <ArtifactViewer artifact={artifact} />
          <CommentsPanel artifactId={artifact.id} />
        </div>
      )}
    </PortalShell>
  );
}
