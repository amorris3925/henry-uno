import type { ArtifactListItem } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_COLORS: Record<string, string> = {
  report: "bg-blue-500/10 text-blue-400",
  dashboard: "bg-purple-500/10 text-purple-400",
  campaign: "bg-green-500/10 text-green-400",
};

export default function ArtifactCard({
  artifact,
}: {
  artifact: ArtifactListItem;
}) {
  const typeColor =
    TYPE_COLORS[artifact.artifact_type || ""] || "bg-[var(--bg-tertiary)] text-[var(--text-muted)]";

  return (
    <a
      href={`/artifacts/${artifact.id}`}
      className="block rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--color-accent)] hover:bg-[var(--bg-tertiary)] transition-all p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
          {artifact.title}
        </h3>
        {artifact.artifact_type && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${typeColor}`}
          >
            {artifact.artifact_type}
          </span>
        )}
      </div>

      {artifact.summary && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
          {artifact.summary}
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>
          {artifact.portal_shared_at
            ? timeAgo(artifact.portal_shared_at)
            : timeAgo(artifact.created_at)}
        </span>
        {artifact.tags && artifact.tags.length > 0 && (
          <div className="flex gap-1">
            {artifact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
