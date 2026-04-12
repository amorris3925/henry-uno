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
}

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
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Social Media
        </h1>
        {competitors.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} shared with you
          </p>
        )}
      </div>

      {competitors.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-16 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40 text-[var(--text-muted)]">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">
            No competitor profiles shared with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {competitors.map((c) => (
            <a
              key={c.id}
              href={`/social/${c.id}`}
              className="block rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--color-accent)] hover:bg-[var(--bg-tertiary)] transition-all p-4"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-9 h-9 rounded-md bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
                  {c.brand_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {c.brand_name}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    @{c.profile_handle} &middot; {c.platform}
                  </p>
                </div>
              </div>
              {c.description && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                  {c.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                {c.niche && (
                  <span className="bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                    {c.niche}
                  </span>
                )}
                {c.competitor_category && (
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
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
