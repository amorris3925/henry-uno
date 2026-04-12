"use client";

import { usePathname, useRouter } from "next/navigation";
import { clientApi } from "@/lib/api";
import type { PortalUser } from "@/lib/auth";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  toolKey: string;
}

const TOOL_NAV: NavItem[] = [
  {
    path: "/artifacts",
    label: "Artifacts",
    toolKey: "artifacts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    path: "/social",
    label: "Social Media",
    toolKey: "social",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
];

export default function PortalShell({
  user,
  children,
}: {
  user: PortalUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleNav = TOOL_NAV.filter((item) =>
    user.tool_access.includes(item.toolKey)
  );

  async function handleLogout() {
    await clientApi("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
        {/* Header */}
        <div className="h-14 flex items-center px-3 gap-2 border-b border-[var(--border-color)]">
          <div className="w-8 h-8 shrink-0 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white font-semibold text-sm">
            H
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Henry
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-secondary)] font-medium">
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-primary)] truncate">
                {user.name || user.email.split("@")[0]}
              </p>
              <button
                onClick={handleLogout}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
