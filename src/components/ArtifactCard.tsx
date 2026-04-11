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
  report: "bg-blue-100 text-blue-700",
  dashboard: "bg-purple-100 text-purple-700",
  campaign: "bg-green-100 text-green-700",
};

export default function ArtifactCard({
  artifact,
}: {
  artifact: ArtifactListItem;
}) {
  const typeColor =
    TYPE_COLORS[artifact.artifact_type || ""] || "bg-gray-100 text-gray-600";

  return (
    <a
      href={`/artifacts/${artifact.id}`}
      className="block bg-white rounded-xl border hover:border-henry-500 hover:shadow-md transition-all p-5"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2">
          {artifact.title}
        </h3>
        {artifact.artifact_type && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${typeColor}`}
          >
            {artifact.artifact_type}
          </span>
        )}
      </div>

      {artifact.summary && (
        <p className="text-sm text-gray-500 line-clamp-3 mb-3">
          {artifact.summary}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
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
                className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
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
