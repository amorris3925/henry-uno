import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PortalShell from "@/components/PortalShell";

const TOOL_META: Record<string, { label: string; icon: string; href: string; description: string }> = {
  artifacts: {
    label: "Artifacts",
    icon: "\uD83D\uDCC4",
    href: "/artifacts",
    description: "Reports, research, and dashboards shared with you",
  },
  calendar: {
    label: "Calendar",
    icon: "\uD83D\uDCC5",
    href: "/calendar",
    description: "Your scheduled events and meetings",
  },
  social: {
    label: "Social Media",
    icon: "\uD83D\uDCF1",
    href: "/social",
    description: "Social media analytics and posts",
  },
  production: {
    label: "Production",
    icon: "\u2699\uFE0F",
    href: "/production",
    description: "Production pipeline and project status",
  },
};

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const tools = (user.tool_access || [])
    .map((t) => TOOL_META[t])
    .filter(Boolean);

  return (
    <PortalShell user={user}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-gray-500 mt-1">Your portal</p>
      </div>

      {tools.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-400">
            No tools have been enabled for your account yet.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Contact your admin to get access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="bg-white rounded-xl border hover:border-henry-500 hover:shadow-md transition-all p-6"
            >
              <div className="text-3xl mb-3">{tool.icon}</div>
              <h3 className="font-semibold text-gray-900">{tool.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
            </a>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
