import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { portalApi } from "@/lib/api";
import PortalShell from "@/components/PortalShell";

interface Competitor {
  id: string;
  brand_name: string;
  platform: string;
  profile_handle: string;
  description: string | null;
  niche: string | null;
  competitor_category: string | null;
  last_synced_at: string | null;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "\uD83D\uDCF7",
  facebook: "\uD83D\uDCF1",
  youtube: "\u25B6\uFE0F",
  tiktok: "\uD83C\uDFB5",
};

export default async function SocialPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  let competitors: Competitor[] = [];
  try {
    const data = await portalApi<{ competitors: Competitor[] }>(
      "/portal-api/social/competitors",
      { userId: user.id, userEmail: user.email }
    );
    competitors = data.competitors || [];
  } catch {
    // empty state
  }

  return (
    <PortalShell user={user}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
          <p className="text-gray-500 text-sm mt-1">
            {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} shared with you
          </p>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Back to dashboard
        </a>
      </div>

      {competitors.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-400">
            No competitor profiles shared with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map((c) => (
            <a
              key={c.id}
              href={`/social/${c.id}`}
              className="block bg-white rounded-xl border hover:border-blue-400 hover:shadow-md transition-all p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">
                  {PLATFORM_ICONS[c.platform] || "\uD83C\uDF10"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {c.brand_name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    @{c.profile_handle} &middot; {c.platform}
                  </p>
                </div>
              </div>
              {c.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {c.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {c.niche && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded">
                    {c.niche}
                  </span>
                )}
                {c.competitor_category && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                    {c.competitor_category}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
