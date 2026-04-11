import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";
import ArtifactViewer from "@/components/ArtifactViewer";
import CommentsPanel from "@/components/CommentsPanel";
import type { Artifact } from "@/lib/types";

export default async function ArtifactDetailPage({
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
    error = e instanceof Error ? e.message : "Failed to load artifact";
  }

  return (
    <PortalShell user={user}>
      <div className="mb-6">
        <a
          href="/artifacts"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          &larr; Back to artifacts
        </a>
      </div>

      {error || !artifact ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-red-500">{error || "Artifact not found"}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {artifact.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
              {artifact.artifact_type && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {artifact.artifact_type}
                </span>
              )}
              <span>
                {new Date(artifact.created_at).toLocaleDateString()}
              </span>
              {artifact.portal_shared_by && (
                <span>Shared by {artifact.portal_shared_by}</span>
              )}
            </div>
            {artifact.summary && (
              <p className="text-gray-500 mt-3">{artifact.summary}</p>
            )}
          </div>

          <ArtifactViewer artifact={artifact} />
          <CommentsPanel artifactId={artifact.id} />
        </div>
      )}
    </PortalShell>
  );
}
