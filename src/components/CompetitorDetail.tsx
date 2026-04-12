"use client";

interface CompetitorData {
  profile: Record<string, unknown>;
  posts: Record<string, unknown>[];
  analyses: Record<string, unknown>[];
  metrics: Record<string, unknown>[];
  strategy: Record<string, unknown>[];
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function pctBar(value: number, max: number, color = "bg-blue-500") {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CompetitorDetail({ data }: { data: CompetitorData }) {
  const { profile, posts, analyses, metrics, strategy } = data;
  const m = metrics[0] as Record<string, unknown> | undefined;
  const s = strategy[0] as Record<string, unknown> | undefined;

  const analysisMap = new Map(
    analyses.map((a) => [a.post_id as string, a])
  );

  // Sort posts by date
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(b.posted_at as string).getTime() -
      new Date(a.posted_at as string).getTime()
  );

  const viralRatio = (m?.viral_ratio as number) ?? 0;
  const steadyRatio = (m?.steady_ratio as number) ?? 0;
  const belowRatio = (m?.below_average_ratio as number) ?? 0;

  const pillarDist = (s?.pillar_distribution as Record<string, number>) ?? {};
  const maxPillar = Math.max(...Object.values(pillarDist), 1);

  const hookPerf = (m?.hook_performance as Record<string, { count: number; avg_rps: number }>) ?? {};
  const maxHookRps = Math.max(...Object.values(hookPerf).map((h) => h.avg_rps), 1);

  const engagementTrend = (m?.engagement_trend as { month: string; avg_engagement: number; post_count: number }[]) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            {((profile.brand_name as string) || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {profile.brand_name as string}
            </h1>
            <p className="text-sm text-gray-400">
              @{profile.profile_handle as string} &middot;{" "}
              {profile.platform as string}
            </p>
            {profile.bio ? (
              <p className="text-sm text-gray-600 mt-2">
                {String(profile.bio)}
              </p>
            ) : null}
            {profile.description ? (
              <p className="text-sm text-gray-500 mt-1">
                {String(profile.description)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {m && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">Followers</p>
            <p className="text-lg font-bold text-gray-900">
              {formatNumber(m.follower_count as number)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">Posts/Week</p>
            <p className="text-lg font-bold text-gray-900">
              {((m.avg_posts_per_week as number) ?? 0).toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">Viral Rate</p>
            <p className="text-lg font-bold text-green-600">
              {(viralRatio * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 mb-1">Total Posts</p>
            <p className="text-lg font-bold text-gray-900">{posts.length}</p>
          </div>
        </div>
      )}

      {/* Performance Distribution */}
      {m && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Performance Distribution
          </h3>
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <div className="h-20 flex items-end justify-center">
                <div
                  className="w-full max-w-[60px] bg-green-400 rounded-t"
                  style={{ height: `${viralRatio * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Viral</p>
              <p className="text-sm font-semibold text-green-600">
                {(viralRatio * 100).toFixed(0)}%
              </p>
            </div>
            <div className="flex-1 text-center">
              <div className="h-20 flex items-end justify-center">
                <div
                  className="w-full max-w-[60px] bg-blue-400 rounded-t"
                  style={{ height: `${steadyRatio * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Steady</p>
              <p className="text-sm font-semibold text-blue-600">
                {(steadyRatio * 100).toFixed(0)}%
              </p>
            </div>
            <div className="flex-1 text-center">
              <div className="h-20 flex items-end justify-center">
                <div
                  className="w-full max-w-[60px] bg-red-300 rounded-t"
                  style={{ height: `${belowRatio * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Below Avg</p>
              <p className="text-sm font-semibold text-red-500">
                {(belowRatio * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Strategy */}
      {s && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Content Strategy</h3>
          {s.overall_strategy ? (
            <p className="text-sm text-gray-600 mb-4">
              {String(s.overall_strategy)}
            </p>
          ) : null}

          {Object.keys(pillarDist).length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Content Pillars</p>
              <div className="space-y-2">
                {Object.entries(pillarDist)
                  .sort(([, a], [, b]) => b - a)
                  .map(([pillar, count]) => (
                    <div key={pillar} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-28 truncate">
                        {pillar}
                      </span>
                      <div className="flex-1">{pctBar(count, maxPillar)}</div>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {Array.isArray(s.recommendations) &&
            (s.recommendations as string[]).length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Recommendations</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {(s.recommendations as string[]).map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-blue-400">&#x2022;</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Hook Performance */}
      {Object.keys(hookPerf).length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Hook Performance
          </h3>
          <div className="space-y-2">
            {Object.entries(hookPerf)
              .sort(([, a], [, b]) => b.avg_rps - a.avg_rps)
              .slice(0, 8)
              .map(([hook, data]) => (
                <div key={hook} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-32 truncate">
                    {hook}
                  </span>
                  <div className="flex-1">
                    {pctBar(data.avg_rps, maxHookRps, "bg-purple-500")}
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">
                    {data.avg_rps.toFixed(1)} RPS
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Engagement Trend */}
      {engagementTrend.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Engagement Trend
          </h3>
          <div className="flex items-end gap-1 h-32">
            {engagementTrend.map((point, i) => {
              const maxEng = Math.max(
                ...engagementTrend.map((p) => p.avg_engagement),
                1
              );
              const height = (point.avg_engagement / maxEng) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-400 rounded-t min-h-[2px]"
                    style={{ height: `${height}%` }}
                    title={`${point.month}: ${point.avg_engagement.toFixed(0)} avg engagement (${point.post_count} posts)`}
                  />
                  <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">
                    {point.month.slice(-5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Recent Posts ({sortedPosts.length})
        </h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {sortedPosts.slice(0, 50).map((post) => {
            const analysis = analysisMap.get(post.id as string);
            return (
              <div
                key={post.id as string}
                className="border rounded-lg p-3 hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {post.caption ? (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {String(post.caption)}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{post.content_type as string}</span>
                      {post.posted_at ? (
                        <span>
                          {new Date(String(post.posted_at)).toLocaleDateString()}
                        </span>
                      ) : null}
                      {post.viral_classification ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            post.viral_classification === "viral"
                              ? "bg-green-100 text-green-600"
                              : post.viral_classification === "steady"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {String(post.viral_classification)}
                        </span>
                      ) : null}
                      {analysis?.content_pillar ? (
                        <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-[10px]">
                          {String(analysis.content_pillar)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                    <p>
                      {formatNumber(post.likes as number)} likes
                    </p>
                    <p>
                      {formatNumber(post.comments_count as number)} comments
                    </p>
                    {(post.views as number) > 0 && (
                      <p>{formatNumber(post.views as number)} views</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
