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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Artifacts</h1>
          <p className="text-gray-500 text-sm mt-1">
            {artifacts.length} shared with you
          </p>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Back to dashboard
        </a>
      </div>

      {artifacts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-400">No artifacts shared with you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((a) => (
            <ArtifactCard key={a.id} artifact={a} />
          ))}
        </div>
      )}
    </PortalShell>
  );
}
