"use client";
// @ts-nocheck — ported from dashboard-v2/CreatorDeepDive.tsx with Record<string, unknown> props

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import * as d3 from 'd3'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)
import {
  AlertTriangle,
  Sparkles,
  Target,
  MessageCircle,
  Brain,
  ChevronRight,
  Layers,
  TrendingDown,
  Award,
} from 'lucide-react'

// ── Inlined shared utilities (from dashboard shared module) ─────────────────

function storageUrl(path: string | null): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/social-media/${path}`
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return `${(n * 100).toFixed(0)}%`
}

function prettyLabel(key: string): string {
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const GENERIC_KEYS = new Set([
  'other', 'Other', 'none', 'None', 'n/a', 'N/A', '',
  'unknown', 'Unknown', 'null', 'undefined', 'no_hook',
])

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
      <div className="mb-3 opacity-30">{icon}</div>
      <p className="text-sm">{title}</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  )
}

const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#14b8a6',
]

const CHART_OPTIONS_BASE: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#999', font: { size: 11 } } },
  },
  scales: {
    x: { ticks: { color: '#666', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#666', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
  },
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Generic label filter ────────────────────────────────────────────────────
function filterGeneric<V>(entries: [string, V][]): [string, V][] {
  return entries.filter(([k]) => !GENERIC_KEYS.has(k.trim()))
}

// ── Post-type filtering & weighted scoring ─────────────────────────────────
type PostTypeFilter = 'all' | 'video' | 'carousel' | 'static'

function matchesPostType(contentType: string, filter: PostTypeFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'video') return ['reel', 'video', 'short'].includes(contentType)
  if (filter === 'carousel') return contentType === 'carousel'
  if (filter === 'static') return contentType === 'post'
  return false
}

function availablePostTypes(posts: Record<string, unknown>[]): PostTypeFilter[] {
  const types = new Set(posts.map((p) => p.content_type as string))
  const result: PostTypeFilter[] = ['all']
  if (['reel', 'video', 'short'].some((t) => types.has(t))) result.push('video')
  if (types.has('carousel')) result.push('carousel')
  if (types.has('post')) result.push('static')
  return result
}

function computeEngagementTrend(posts: Record<string, unknown>[], filter: PostTypeFilter) {
  const filtered = posts.filter(
    (p) => matchesPostType(p.content_type as string, filter) && p.posted_at && p.relative_performance_score != null
  )
  const byMonth: Record<string, { total: number; count: number }> = {}
  for (const p of filtered) {
    const month = (p.posted_at as string).slice(0, 7)
    const entry = (byMonth[month] ??= { total: 0, count: 0 })
    entry.total += p.relative_performance_score as number
    entry.count++
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, avg_engagement: v.total / v.count, post_count: v.count }))
}

function computeHeatmapData(
  posts: Record<string, unknown>[],
  filter: PostTypeFilter
): Record<string, { avg_rps: number; count: number }> {
  const filtered = posts.filter(
    (p) =>
      matchesPostType(p.content_type as string, filter) &&
      p.day_of_week != null &&
      p.hour_of_day != null &&
      p.relative_performance_score != null
  )
  const buckets: Record<string, { total: number; count: number }> = {}
  for (const p of filtered) {
    const key = `${p.day_of_week},${p.hour_of_day}`
    const entry = (buckets[key] ??= { total: 0, count: 0 })
    entry.total += p.relative_performance_score as number
    entry.count++
  }
  const result: Record<string, { avg_rps: number; count: number }> = {}
  for (const [key, v] of Object.entries(buckets)) {
    result[key] = { avg_rps: v.total / v.count, count: v.count }
  }
  return result
}

function weightedScore(rps: number, count: number): number {
  return rps * (1 - 1 / (count + 1))
}

const POST_TYPE_LABELS: Record<PostTypeFilter, string> = {
  all: 'All',
  video: 'Video',
  carousel: 'Carousel',
  static: 'Static',
}

function PostTypeSelector({
  value,
  onChange,
  available,
}: {
  value: PostTypeFilter
  onChange: (v: PostTypeFilter) => void
  available: PostTypeFilter[]
}) {
  return (
    <div className="flex gap-1 mb-2">
      {available.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
            value === t
              ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          {POST_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  )
}

// ── Global floating tooltip ─────────────────────────────────────────────────
const TOOLTIP_ID = 'creator-deep-dive-tooltip'

function getTooltipEl(): HTMLDivElement {
  let el = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = TOOLTIP_ID
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '9999',
      pointerEvents: 'none',
      padding: '8px 12px',
      borderRadius: '8px',
      background: 'rgba(8,8,18,0.96)',
      border: '1px solid rgba(255,255,255,0.18)',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '1.6',
      maxWidth: '300px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      display: 'none',
      whiteSpace: 'pre-line',
      transition: 'opacity 0.1s',
    })
    document.body.appendChild(el)
  }
  return el
}

function showTip(x: number, y: number, content: string) {
  const el = getTooltipEl()
  el.textContent = content
  el.style.display = 'block'
  const offRight = x + 16 + 300 > window.innerWidth
  el.style.left = offRight ? `${x - 316}px` : `${x + 16}px`
  el.style.top = `${y - 18}px`
}

function hideTip() {
  const el = document.getElementById(TOOLTIP_ID)
  if (el) el.style.display = 'none'
}

// Chart.js external tooltip — disables built-in bubble and calls showTip instead
function externalTooltip(context: any) {
  const { chart, tooltip } = context
  if (tooltip.opacity === 0) { hideTip(); return }
  const rect = chart.canvas.getBoundingClientRect()
  const title = (tooltip.title || []).join('\n')
  const body = (tooltip.body || []).flatMap((b: any) => b.lines as string[]).join('\n')
  showTip(rect.left + tooltip.caretX, rect.top + tooltip.caretY, [title, body].filter(Boolean).join('\n'))
}

// ── UI primitives ───────────────────────────────────────────────────────────
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2">{children}</div>
}

function Insight({ text }: { text: string }) {
  return <p className="text-[11px] text-white/40 mt-2 leading-relaxed italic">{text}</p>
}

function KpiChip({ label, value, sub, accent = 'text-white' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-md bg-[var(--bg-tertiary)] min-w-[80px]">
      <div className={`text-xl font-bold leading-none ${accent}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/60 mt-0.5">{sub}</div>}
      <div className="text-[11px] text-white/60 uppercase tracking-wider mt-1">{label}</div>
    </div>
  )
}

function MiniRanked({ entries, max, unit = 'avg RPS', labelFn = prettyLabel }: { entries: [string, number][]; max: number; unit?: string; labelFn?: (k: string) => string }) {
  return (
    <div className="space-y-1">
      {entries.map(([key, val], i) => {
        const label = labelFn(key)
        return (
        <div
          key={key}
          className="flex items-center gap-2 cursor-default"
          onMouseMove={(e) => showTip(e.clientX, e.clientY, `${label}\n${val.toFixed(2)} ${unit}${i === 0 ? '\n-- Best performer' : ''}`)}
          onMouseLeave={hideTip}
        >
          <span className="text-[11px] text-white/60 w-3 text-right shrink-0">{i + 1}</span>
          <span className="text-[12px] text-white truncate flex-1 min-w-0">{label}</span>
          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(val / max) * 100}%`,
                backgroundColor: i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : i === 2 ? '#06b6d4' : '#6b7280',
              }}
            />
          </div>
          <span className="text-[11px] text-white/70 w-9 text-right tabular-nums shrink-0">{val.toFixed(2)}</span>
        </div>
        )
      })}
    </div>
  )
}

function ChartPanel({ title, height = 140, insight, children }: { title: string; height?: number; insight?: string; children: React.ReactNode }) {
  return (
    <Panel>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ height }}>{children}</div>
      {insight && <Insight text={insight} />}
    </Panel>
  )
}

const CHART_OPTS_COMPACT: any = {
  ...CHART_OPTIONS_BASE,
  plugins: {
    ...CHART_OPTIONS_BASE.plugins,
    legend: { display: false },
    tooltip: { enabled: false, external: externalTooltip },
  },
  scales: {
    x: {
      ...CHART_OPTIONS_BASE.scales?.x,
      ticks: { color: 'rgba(255,255,255,0.75)', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ...CHART_OPTIONS_BASE.scales?.y,
      ticks: { color: 'rgba(255,255,255,0.75)', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
  },
}

// ── Aggregation ─────────────────────────────────────────────────────────────

function mergeRpsMap(
  maps: (Record<string, { count: number; avg_rps: number }> | null | undefined)[]
): Record<string, { count: number; avg_rps: number }> {
  const sumRps: Record<string, number> = {}
  const sumCount: Record<string, number> = {}
  const contributors: Record<string, number> = {}
  for (const map of maps) {
    if (!map) continue
    for (const [k, v] of Object.entries(map)) {
      sumRps[k] = (sumRps[k] ?? 0) + v.avg_rps
      sumCount[k] = (sumCount[k] ?? 0) + v.count
      contributors[k] = (contributors[k] ?? 0) + 1
    }
  }
  const result: Record<string, { count: number; avg_rps: number }> = {}
  for (const k of Object.keys(sumRps)) {
    result[k] = { avg_rps: sumRps[k] / contributors[k], count: sumCount[k] }
  }
  return result
}

function avgNum(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null)
  return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0) / nums.length
}

function aggregateMetrics(selected: Record<string, any>[]): Record<string, any> {
  if (selected.length === 1) return selected[0]

  // Merge heatmap
  const heatmapSumRps: Record<string, number> = {}
  const heatmapSumCount: Record<string, number> = {}
  const heatmapContrib: Record<string, number> = {}
  for (const m of selected) {
    if (!m.day_time_heatmap) continue
    for (const [k, v] of Object.entries(m.day_time_heatmap as Record<string, { avg_rps: number; count: number }>)) {
      heatmapSumRps[k] = (heatmapSumRps[k] ?? 0) + v.avg_rps
      heatmapSumCount[k] = (heatmapSumCount[k] ?? 0) + v.count
      heatmapContrib[k] = (heatmapContrib[k] ?? 0) + 1
    }
  }
  const mergedHeatmap: Record<string, { avg_rps: number; count: number }> = {}
  for (const k of Object.keys(heatmapSumRps)) {
    mergedHeatmap[k] = { avg_rps: heatmapSumRps[k] / heatmapContrib[k], count: heatmapSumCount[k] }
  }

  // Merge engagement trend by month
  const trendByMonth: Record<string, { sumEng: number; sumCount: number; n: number }> = {}
  for (const m of selected) {
    for (const d of (m.engagement_trend ?? []) as { month: string; avg_engagement: number; post_count: number }[]) {
      if (!trendByMonth[d.month]) trendByMonth[d.month] = { sumEng: 0, sumCount: 0, n: 0 }
      trendByMonth[d.month].sumEng += d.avg_engagement
      trendByMonth[d.month].sumCount += d.post_count
      trendByMonth[d.month].n++
    }
  }
  const mergedTrend = Object.entries(trendByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, avg_engagement: v.sumEng / v.n, post_count: v.sumCount }))

  // Merge pillar_drift / format_distribution_over_time
  const mergeDrift = (key: 'pillar_drift' | 'format_distribution_over_time') => {
    const result: Record<string, Record<string, number>> = {}
    const contribs: Record<string, Record<string, number>> = {}
    for (const m of selected) {
      const data = m[key] as Record<string, Record<string, number>> | null | undefined
      if (!data) continue
      for (const [month, pillars] of Object.entries(data)) {
        if (!result[month]) { result[month] = {}; contribs[month] = {} }
        for (const [p, v] of Object.entries(pillars)) {
          result[month][p] = (result[month][p] ?? 0) + v
          contribs[month][p] = (contribs[month][p] ?? 0) + 1
        }
      }
    }
    for (const month of Object.keys(result)) {
      for (const p of Object.keys(result[month])) {
        result[month][p] /= contribs[month][p]
      }
    }
    return result
  }

  return {
    id: 'aggregated',
    platform: [...new Set(selected.map((m) => m.platform as string))].join(', '),
    profile_handle: selected.map((m) => m.profile_handle as string).join(', '),
    computed_at: selected[0]?.computed_at ?? '',
    follower_count: selected.reduce((s, m) => s + ((m.follower_count as number) ?? 0), 0),
    avg_posts_per_week: avgNum(selected.map((m) => m.avg_posts_per_week as number | null)),
    posting_consistency_score: avgNum(selected.map((m) => m.posting_consistency_score as number | null)),
    viral_ratio: avgNum(selected.map((m) => m.viral_ratio as number | null)),
    steady_ratio: avgNum(selected.map((m) => m.steady_ratio as number | null)),
    below_average_ratio: avgNum(selected.map((m) => m.below_average_ratio as number | null)),
    visual_consistency_score: avgNum(selected.map((m) => m.visual_consistency_score as number | null)),
    visual_consistency_notes: null,
    hook_performance: mergeRpsMap(selected.map((m) => m.hook_performance as Record<string, { count: number; avg_rps: number }> | null)),
    cta_effectiveness: mergeRpsMap(selected.map((m) => m.cta_effectiveness as Record<string, { count: number; avg_rps: number }> | null)),
    caption_length_buckets: mergeRpsMap(selected.map((m) => m.caption_length_buckets as Record<string, { count: number; avg_rps: number }> | null)),
    hashtag_performance: mergeRpsMap(selected.map((m) => m.hashtag_performance as Record<string, { count: number; avg_rps: number }> | null)),
    day_time_heatmap: mergedHeatmap,
    engagement_trend: mergedTrend,
    pillar_drift: mergeDrift('pillar_drift'),
    format_distribution_over_time: mergeDrift('format_distribution_over_time'),
    growth_inflection_points: selected.flatMap((m) => (m.growth_inflection_points as any[]) ?? []),
    best_worst_breakdown: null,
    content_fatigue_flags: selected.flatMap((m) => (m.content_fatigue_flags as any[]) ?? []),
    detected_series: selected.flatMap((m) => (m.detected_series as any[]) ?? []),
    high_resonance_posts: selected
      .flatMap((m) => (m.high_resonance_posts as any[]) ?? [])
      .sort((a: any, b: any) => b.comment_like_ratio - a.comment_like_ratio),
    format_migration_roi: null,
    frequency_engagement_corr: null,
    duration_buckets: mergeRpsMap(selected.map((m) => m.duration_buckets as Record<string, { count: number; avg_rps: number }> | null)),
  }
}

// ── Main component ──────────────────────────────────────────────────────────

interface CreatorDeepDiveProps {
  metrics: Record<string, unknown>[]
  strategies: Record<string, unknown>[]
  posts: Record<string, unknown>[]
  profile?: Record<string, unknown>
  analysisMap?: Map<string, Record<string, unknown>>
}

// ── RPS Definition Banner ───────────────────────────────────────────────────
function RpsDefinition() {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-blue-500/5 border border-blue-500/15">
      <Sparkles size={14} className="text-blue-400 shrink-0 mt-0.5" />
      <p className="text-[11px] text-white/60 leading-relaxed">
        <span className="text-white/80 font-medium">RPS (Relative Performance Score)</span> — how a post performed vs. that creator&apos;s average.
        1.0 = average, 2.0 = 2x better, 0.5 = half the average. Used across all metrics below.
      </p>
    </div>
  )
}

// ── Creator Bio Bar ─────────────────────────────────────────────────────────
function CreatorBioBar({ profile }: { profile?: Record<string, unknown> }) {
  if (!profile) return null
  const hasContent = profile.description || profile.bio || profile.niche
  if (!hasContent) return null
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">{profile.brand_name as string}</span>
            {profile.niche && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)]">{profile.niche as string}</span>
            )}
          </div>
          {profile.description && <p className="text-xs text-white/60 leading-relaxed">{profile.description as string}</p>}
          {profile.bio && <p className="text-xs text-white/50 leading-relaxed mt-1">{profile.bio as string}</p>}
          {profile.company_associations && (profile.company_associations as string[]).length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[9px] text-white/40 uppercase tracking-wider">Associated:</span>
              {(profile.company_associations as string[]).map((c: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/70">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

export function CreatorDeepDive({ metrics, strategies, posts, profile, analysisMap }: CreatorDeepDiveProps) {
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const metricsAny = metrics as Record<string, any>[]
  const postsAny = posts as Record<string, any>[]

  const profiles = [...new Set(metricsAny.map((x) => `${x.platform}:${x.profile_handle}`))]
  const profilesKey = profiles.join(',')

  useEffect(() => {
    // Reset selection when available profiles change (e.g. switching competitors)
    // or when nothing is selected yet
    const hasValidSelection = selectedProfiles.some((sp) => profiles.includes(sp))
    if (profiles.length > 0 && !hasValidSelection) {
      setSelectedProfiles([profiles[0]])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesKey])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Clean up tooltip div on unmount
  useEffect(() => () => { hideTip() }, [])

  const toggleProfile = (p: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    )
  }

  const isAllSelected = selectedProfiles.length === profiles.length
  const toggleAll = () => setSelectedProfiles(isAllSelected ? [profiles[0]] : [...profiles])

  const selectedMetrics = metricsAny.filter((x) => selectedProfiles.includes(`${x.platform}:${x.profile_handle}`))
  const m = selectedMetrics.length === 0 ? null : aggregateMetrics(selectedMetrics)
  const s = selectedMetrics.length === 1
    ? (strategies as Record<string, any>[]).find((x) => `${x.platform}:${x.profile_handle}` === selectedProfiles[0])
    : null

  const dropdownLabel =
    selectedProfiles.length === 0 ? 'Select creators...'
    : isAllSelected && profiles.length > 1 ? 'All creators'
    : selectedProfiles.length <= 2 ? selectedProfiles.map((p) => `@${p.split(':')[1]}`).join(', ')
    : `${selectedProfiles.length} creators`

  const filteredPosts = useMemo(
    () => postsAny.filter((p) => selectedProfiles.includes(`${p.platform}:${p.profile_handle}`)),
    [postsAny, selectedProfiles]
  )

  const sharedMonths = useMemo(() => {
    if (!m) return []
    const set = new Set<string>()
    for (const k of Object.keys((m.pillar_drift as Record<string, any>) ?? {})) set.add(k.slice(0, 7))
    for (const k of Object.keys((m.format_distribution_over_time as Record<string, any>) ?? {})) set.add(k.slice(0, 7))
    for (const e of (m.engagement_trend as { month: string }[]) ?? []) set.add(e.month.slice(0, 7))
    return [...set].sort()
  }, [m?.pillar_drift, m?.format_distribution_over_time, m?.engagement_trend])

  if (metrics.length === 0) {
    return <EmptyState icon={<Brain size={48} />} title="No creator metrics yet" subtitle="Run: python scripts/social_intelligence.py --all" />
  }

  if (!m) return null

  return (
    <div className="space-y-4" onMouseLeave={hideTip}>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Multi-select dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-white outline-none hover:border-[var(--color-accent)] transition-colors min-w-[160px]"
          >
            <span className="flex-1 text-left truncate">{dropdownLabel}</span>
            <ChevronRight size={14} className={`text-white/50 shrink-0 transition-transform ${dropdownOpen ? 'rotate-90' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full mt-1 left-0 z-50 min-w-[220px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl py-1">
              {/* Select all row */}
              <button
                onClick={toggleAll}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isAllSelected ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-white/30'}`}>
                  {isAllSelected && <span className="text-white text-[9px] font-bold leading-none">&#10003;</span>}
                </div>
                <span className="font-medium">{isAllSelected ? 'Deselect all' : 'Select all'}</span>
              </button>
              <div className="border-t border-white/10 my-1" />
              {profiles.map((p) => {
                const [plat, handle] = p.split(':')
                const checked = selectedProfiles.includes(p)
                return (
                  <button
                    key={p}
                    onClick={() => toggleProfile(p)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-white/30'}`}>
                      {checked && <span className="text-white text-[9px] font-bold leading-none">&#10003;</span>}
                    </div>
                    <span className="text-white font-medium truncate">@{handle}</span>
                    <span className="text-white/40 ml-auto shrink-0">{plat}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedProfiles.length > 1 && (
          <span className="text-[11px] text-white/40 italic">aggregated</span>
        )}

        <div className="flex gap-2 flex-wrap">
          <KpiChip
            label="Followers"
            value={formatNumber(m.follower_count as number)}
            sub={selectedProfiles.length > 1 ? 'combined' : undefined}
          />
          <KpiChip label="Posts/Week" value={(m.avg_posts_per_week as number | null)?.toFixed(1) ?? '\u2014'} accent="text-green-400" />
          <KpiChip label="Consistency" value={(m.posting_consistency_score as number | null)?.toFixed(2) ?? '\u2014'} sub="/1.0" accent="text-blue-400" />
          <KpiChip label="Viral Rate" value={formatPct(m.viral_ratio as number | null)} sub={`${formatPct(m.steady_ratio as number | null)} steady`} accent="text-amber-400" />
          <KpiChip label="Below Avg" value={formatPct(m.below_average_ratio as number | null)} accent="text-red-400" />
          <KpiChip label="Visual Score" value={(m.visual_consistency_score as number | null)?.toFixed(1) ?? '\u2014'} sub="/10" accent="text-cyan-400" />
        </div>
      </div>

      {/* RPS Definition */}
      <RpsDefinition />

      {/* Creator Bio */}
      <CreatorBioBar profile={profile} />

      {/* Fatigue alerts */}
      {m.content_fatigue_flags && (m.content_fatigue_flags as any[]).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(m.content_fatigue_flags as any[]).map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20"
              onMouseMove={(e) => showTip(e.clientX, e.clientY, `Content fatigue: ${f.pillar}\nHistorical RPS: ${f.historical_rps.toFixed(2)}\nRecent RPS: ${f.recent_rps.toFixed(2)}\nDecline: ${Math.abs(f.decline_pct).toFixed(0)}%\n\nThis pillar is losing steam. Refresh or reduce its frequency.`)}
              onMouseLeave={hideTip}
            >
              <AlertTriangle size={12} className="text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 font-medium">{f.pillar}</span>
              <span className="text-xs text-white/60">
                RPS down {Math.abs(f.decline_pct).toFixed(0)}% — was {f.historical_rps.toFixed(2)}, now {f.recent_rps.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Content Pillars — full width */}
      {(s?.pillar_distribution || s?.overall_strategy) ? (
        <ContentPillarsPanel strategy={s ?? null} metrics={m} />
      ) : (
        <Panel>
          <div className="flex items-center gap-2 text-white/40 text-xs italic">
            <Brain size={12} />
            No AI strategy yet — run social_analyzer.py for this profile, or use Add Creator to import with full analysis.
          </div>
        </Panel>
      )}

      {/* Performance panels (2x2) + Day/Time Heatmap side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <HookPerformancePanel data={m.hook_performance as Record<string, { count: number; avg_rps: number }> | null} />
          <CTAPanel data={m.cta_effectiveness as Record<string, { count: number; avg_rps: number }> | null} />
          <CaptionPanel data={m.caption_length_buckets as Record<string, { count: number; avg_rps: number }> | null} />
          <HashtagPanel data={m.hashtag_performance as Record<string, { count: number; avg_rps: number }> | null} />
        </div>
        <DayTimeHeatmap data={m.day_time_heatmap as Record<string, { avg_rps: number; count: number }> | null} posts={filteredPosts} />
      </div>

      {/* Aligned Historical Charts — stacked vertically with shared months */}
      <PillarDrift data={m.pillar_drift as Record<string, Record<string, number>> | null} height={260} sharedMonths={sharedMonths} posts={filteredPosts} />
      <FormatMigration data={m.format_distribution_over_time as Record<string, Record<string, number>> | null} height={220} sharedMonths={sharedMonths} posts={filteredPosts} />
      <EngagementTrend data={m.engagement_trend as { month: string; avg_engagement: number; post_count: number }[] | null} inflections={m.growth_inflection_points as any[] | null} posts={filteredPosts} sharedMonths={sharedMonths} />

      <SeriesDetection series={m.detected_series as any[] | null} />

      {/* Pillar & Format Shift Impact Analysis */}
      <PillarFormatImpactPanel metrics={m} />

      {/* Best/Worst + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <BestWorstBreakdown data={m.best_worst_breakdown as any} />
        {s?.recommendations && (s.recommendations as any[]).length > 0 ? (
          <Panel>
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={12} className="text-green-400" />
              <SectionLabel>Recommendations</SectionLabel>
            </div>
            <div className="space-y-1.5">
              {(s.recommendations as string[]).slice(0, 5).map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight size={10} className="text-green-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-white leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel>
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={12} className="text-white/30" />
              <SectionLabel>Recommendations</SectionLabel>
            </div>
            <p className="text-xs text-white/40 italic">No AI recommendations yet for this profile.</p>
          </Panel>
        )}
      </div>

      <HighResonancePosts posts={m.high_resonance_posts as any[] | null} />
      <WorstPerformingPosts posts={filteredPosts} />

      {/* Visual Consistency — full width at bottom */}
      <VisualConsistency
        score={m.visual_consistency_score as number | null}
        notes={m.visual_consistency_notes as string | null}
        posts={filteredPosts.filter((p: any) => p.image_url || p.image_storage_path).slice(0, 20)}
        analysisMap={analysisMap}
      />
    </div>
  )
}

// ── Content Pillars panel ────────────────────────────────────────────────────

const PILLAR_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16']

function ContentPillarsPanel({ strategy, metrics }: { strategy: Record<string, any> | null; metrics: Record<string, any> }) {
  const raw = strategy?.pillar_distribution as Record<string, number> | undefined
  if (!raw) {
    // No pillar data — show strategy text if available
    return strategy?.overall_strategy ? (
      <Panel>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} className="text-purple-400" />
          <SectionLabel>Content Strategy</SectionLabel>
        </div>
        <p className="text-xs text-white/80 leading-relaxed">{strategy.overall_strategy as string}</p>
      </Panel>
    ) : null
  }

  const pillars = filterGeneric(Object.entries(raw)).sort(([, a], [, b]) => b - a)
  if (pillars.length === 0) return null

  const total = pillars.reduce((sum, [, c]) => sum + c, 0)
  const bestPillar = (metrics.best_worst_breakdown as any)?.best?.common_pillar
  const fatiguedSet = new Set(((metrics.content_fatigue_flags as any[]) ?? []).map((f: any) => f.pillar))
  const fatigue = Object.fromEntries(((metrics.content_fatigue_flags as any[]) ?? []).map((f: any) => [f.pillar, f]))

  return (
    <Panel>
      <div className="flex items-center gap-1.5 mb-3">
        <Layers size={12} className="text-purple-400" />
        <SectionLabel>Content Pillars</SectionLabel>
        <span className="text-[10px] text-white/30 ml-1">{pillars.length} pillars &middot; {total} posts</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-1.5">
        {pillars.map(([pillar, count], i) => {
          const pct = total > 0 ? count / total : 0
          const isBest = pillar === bestPillar
          const declining = fatiguedSet.has(pillar) ? fatigue[pillar] : null
          const color = PILLAR_COLORS[i % PILLAR_COLORS.length]

          return (
            <div
              key={pillar}
              className="cursor-default"
              onMouseMove={(e) =>
                showTip(e.clientX, e.clientY,
                  `${prettyLabel(pillar)}\n${count} posts (${Math.round(pct * 100)}%)` +
                  (isBest ? '\n-- Best performing pillar' : '') +
                  (declining ? `\nRPS declining ${Math.abs(declining.decline_pct).toFixed(0)}% — was ${declining.historical_rps.toFixed(2)}, now ${declining.recent_rps.toFixed(2)}` : '')
                )
              }
              onMouseLeave={hideTip}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] font-medium text-white flex-1 truncate">{prettyLabel(pillar)}</span>
                {isBest && (
                  <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 bg-green-500/20 text-green-400 rounded font-medium shrink-0">
                    <Award size={7} /> Top
                  </span>
                )}
                {declining && (
                  <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 bg-amber-500/15 text-amber-400 rounded font-medium shrink-0">
                    <TrendingDown size={7} /> {Math.abs(declining.decline_pct).toFixed(0)}%&#8595;
                  </span>
                )}
                <span className="text-[10px] text-white/40 shrink-0 tabular-nums">{Math.round(pct * 100)}%</span>
              </div>
              <div className="ml-3 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct * 100}%`, backgroundColor: color + 'cc' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {strategy?.overall_strategy && (
        <p className="text-[10px] text-white/45 leading-relaxed mt-3 pt-3 border-t border-white/8 italic">
          {strategy.overall_strategy as string}
        </p>
      )}
    </Panel>
  )
}

// ── Performance panels ──────────────────────────────────────────────────────

function HookPerformancePanel({ data }: { data: Record<string, { count: number; avg_rps: number }> | null }) {
  if (!data) return null
  const entries = filterGeneric(Object.entries(data)).sort((a, b) => b[1].avg_rps - a[1].avg_rps).slice(0, 6)
  if (entries.length === 0) return null
  const max = entries[0][1].avg_rps || 1
  return (
    <Panel>
      <SectionLabel>Hook Types</SectionLabel>
      <MiniRanked entries={entries.map(([k, v]) => [k, v.avg_rps])} max={max} />
      <Insight text="Hook style ranked by avg RPS. Lead your next post with #1 to maximize reach." />
    </Panel>
  )
}

function CTAPanel({ data }: { data: Record<string, { count: number; avg_rps: number }> | null }) {
  if (!data) return null
  const entries = filterGeneric(Object.entries(data)).sort((a, b) => b[1].avg_rps - a[1].avg_rps).slice(0, 6)
  if (entries.length === 0) return null
  const max = entries[0][1].avg_rps || 1
  return (
    <Panel>
      <SectionLabel>CTA Effectiveness</SectionLabel>
      <MiniRanked entries={entries.map(([k, v]) => [k, v.avg_rps])} max={max} />
      <Insight text="Which call-to-action drives the most engagement. Use the top CTA in your next post." />
    </Panel>
  )
}

function CaptionPanel({ data }: { data: Record<string, { count: number; avg_rps: number }> | null }) {
  if (!data) return null
  const ORDER = ['0-50', '51-100', '101-200', '201-500', '500+']
  const entries = filterGeneric(Object.entries(data).sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])))
  if (entries.length === 0) return null
  const maxRps = Math.max(...entries.map(([, v]) => v.avg_rps)) || 1
  const best = entries.reduce((a, b) => b[1].avg_rps > a[1].avg_rps ? b : a)
  return (
    <Panel>
      <SectionLabel>Caption Length</SectionLabel>
      <div className="space-y-1">
        {entries.map(([bucket, v]) => (
          <div
            key={bucket}
            className={`flex items-center gap-2 cursor-default ${bucket === best[0] ? 'opacity-100' : 'opacity-55'}`}
            onMouseMove={(e) => showTip(e.clientX, e.clientY, `${bucket} char captions\n${v.avg_rps.toFixed(2)} avg RPS across ${v.count} posts${bucket === best[0] ? '\n-- Your sweet spot' : ''}`)}
            onMouseLeave={hideTip}
          >
            <span className="text-[12px] text-white w-24 truncate shrink-0">{bucket} chars</span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(v.avg_rps / maxRps) * 100}%`, backgroundColor: bucket === best[0] ? '#3b82f6' : '#6b7280' }} />
            </div>
            <span className="text-[11px] text-white/70 w-8 text-right tabular-nums shrink-0">{v.avg_rps.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <Insight text={`Sweet spot: ${best[0]} char captions (${best[1].avg_rps.toFixed(2)} RPS, ${best[1].count} posts). Highlighted = best performer.`} />
    </Panel>
  )
}

function HashtagPanel({ data }: { data: Record<string, { count: number; avg_rps: number }> | null }) {
  if (!data) return null
  const entries = filterGeneric(Object.entries(data)).sort((a, b) => b[1].avg_rps - a[1].avg_rps).slice(0, 6)
  if (entries.length === 0) return null
  const max = entries[0][1].avg_rps || 1
  return (
    <Panel>
      <SectionLabel>Top Hashtags</SectionLabel>
      <div className="space-y-1">
        {entries.map(([tag, v], i) => (
          <div
            key={tag}
            className="flex items-center gap-2 cursor-default"
            onMouseMove={(e) => { const display = tag.startsWith('#') ? tag : `#${tag}`; showTip(e.clientX, e.clientY, `${display}\n${v.avg_rps.toFixed(2)} avg RPS across ${v.count} posts${i === 0 ? '\n-- Top performing hashtag' : ''}`) }}
            onMouseLeave={hideTip}
          >
            <span className="text-[11px] text-white/60 w-3 text-right shrink-0">{i + 1}</span>
            <span className="text-[12px] text-blue-300 truncate flex-1 min-w-0">{tag.startsWith('#') ? tag : `#${tag}`}</span>
            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
              <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(v.avg_rps / max) * 100}%` }} />
            </div>
            <span className="text-[11px] text-white/70 w-9 text-right tabular-nums shrink-0">{v.avg_rps.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <Insight text="Hashtags ranked by avg RPS of posts that used them. High RPS tags attract your best-fit audience." />
    </Panel>
  )
}

// ── Timing charts ───────────────────────────────────────────────────────────

function DayTimeHeatmap({ data, posts }: { data: Record<string, { avg_rps: number; count: number }> | null; posts: Record<string, any>[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<PostTypeFilter>('all')
  const available = useMemo(() => availablePostTypes(posts), [posts])

  const effectiveData = useMemo(
    () => (filter === 'all' ? data : computeHeatmapData(posts, filter)),
    [data, posts, filter]
  )

  useEffect(() => {
    if (!effectiveData || !ref.current) return
    const container = ref.current
    container.innerHTML = ''

    const cellSize = 18
    const margin = { top: 20, right: 6, bottom: 4, left: 32 }
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const width = margin.left + margin.right + hours.length * cellSize
    const height = margin.top + margin.bottom + 7 * cellSize

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)

    // Parse both legacy number and new {avg_rps, count} format
    const cells: { day: number; hour: number; rps: number; count: number }[] = []
    for (const [key, val] of Object.entries(effectiveData)) {
      const parts = key.includes(',') ? key.split(',') : key.split('_')
      const [d, h] = parts.map(Number)
      if (!isNaN(d) && !isNaN(h)) {
        const rps = typeof val === 'number' ? val : (val as { avg_rps: number; count: number }).avg_rps
        const count = typeof val === 'number' ? 0 : (val as { avg_rps: number; count: number }).count
        cells.push({ day: d, hour: h, rps, count })
      }
    }

    // Rank-based coloring: assign colors by percentile rank (weighted score)
    // so outliers don't compress the rest of the scale into red.
    const activeCells = cells.filter((c) => c.rps > 0)
    const sortedByWs = [...activeCells]
      .map((c) => ({ ...c, ws: weightedScore(c.rps, c.count) }))
      .sort((a, b) => a.ws - b.ws)
    const rankMap = new Map<string, number>()
    sortedByWs.forEach((c, i) => {
      const pct = sortedByWs.length > 1 ? i / (sortedByWs.length - 1) : 0.5
      rankMap.set(`${c.day},${c.hour}`, pct)
    })
    const rankColorScale = d3.scaleLinear<string>()
      .domain([0, 0.2, 0.4, 0.6, 0.8, 1])
      .range(['#7f1d1d', '#b91c1c', '#d97706', '#ca8a04', '#65a30d', '#16a34a'])
      .clamp(true)
    const colorScale = (c: { day: number; hour: number; rps: number }) => {
      if (c.rps <= 0) return 'rgba(255,255,255,0.03)'
      const pct = rankMap.get(`${c.day},${c.hour}`) ?? 0
      return rankColorScale(pct)
    }

    // Grid lines
    for (let row = 0; row <= 7; row++) {
      svg.append('line')
        .attr('x1', margin.left).attr('x2', margin.left + hours.length * cellSize)
        .attr('y1', margin.top + row * cellSize).attr('y2', margin.top + row * cellSize)
        .attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.5)
    }
    for (let col = 0; col <= 24; col++) {
      svg.append('line')
        .attr('x1', margin.left + col * cellSize).attr('x2', margin.left + col * cellSize)
        .attr('y1', margin.top).attr('y2', margin.top + 7 * cellSize)
        .attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.5)
    }

    svg.selectAll('.hour-label')
      .data(hours.filter((h) => h % 2 === 0))
      .join('text')
      .attr('x', (h) => margin.left + h * cellSize + cellSize / 2)
      .attr('y', margin.top - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', 'rgba(255,255,255,0.85)')
      .text((h) => `${h}`)

    svg.selectAll('.day-label')
      .data(DAY_NAMES.map((d) => d.slice(0, 3)))
      .join('text')
      .attr('x', margin.left - 4)
      .attr('y', (_, i) => margin.top + i * cellSize + cellSize / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('fill', 'rgba(255,255,255,0.85)')
      .text((d) => d)

    // Rank by weighted score for tooltips
    const rankedCells = cells.filter((x) => x.rps > 0)
      .map((c) => ({ ...c, ws: weightedScore(c.rps, c.count) }))
      .sort((a, b) => b.ws - a.ws)

    svg.selectAll('.cell')
      .data(cells)
      .join('rect')
      .attr('x', (c) => margin.left + c.hour * cellSize)
      .attr('y', (c) => margin.top + c.day * cellSize)
      .attr('width', cellSize - 2)
      .attr('height', cellSize - 2)
      .attr('rx', 2)
      .attr('fill', (c) => colorScale(c))
      .style('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent, c) => {
        const rank = rankedCells.findIndex((x) => x.day === c.day && x.hour === c.hour) + 1
        const rankStr = rank > 0 && rank <= 3 ? ` — #${rank} best slot (weighted)` : ''
        const countStr = c.count > 0 ? `${c.count} post${c.count !== 1 ? 's' : ''}\n` : ''
        showTip(event.clientX, event.clientY, `${DAY_NAMES[c.day]} at ${c.hour}:00\n${countStr}Avg RPS: ${c.rps.toFixed(2)}${rankStr}`)
      })
      .on('mouseleave', hideTip)

    // Count labels inside cells
    svg.selectAll('.cell-count')
      .data(cells.filter((c) => c.count > 0))
      .join('text')
      .attr('x', (c) => margin.left + c.hour * cellSize + (cellSize - 2) / 2)
      .attr('y', (c) => margin.top + c.day * cellSize + (cellSize - 2) / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 8)
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .attr('fill', (c) => {
        const rgb = d3.color(colorScale(c))?.rgb()
        if (!rgb) return '#fff'
        const lum = 0.2126 * (rgb.r / 255) + 0.7152 * (rgb.g / 255) + 0.0722 * (rgb.b / 255)
        return lum > 0.4 ? '#111' : '#fff'
      })
      .text((c) => c.count)

  }, [effectiveData])

  if (!effectiveData) return null

  // Top 3 best slots by weighted score
  const topSlots = useMemo(() => {
    const slots: { day: number; hour: number; rps: number; count: number; ws: number }[] = []
    for (const [k, v] of Object.entries(effectiveData)) {
      const parts = k.includes(',') ? k.split(',') : k.split('_')
      const rps = typeof v === 'number' ? v : (v as { avg_rps: number; count: number }).avg_rps
      const count = typeof v === 'number' ? 0 : (v as { avg_rps: number; count: number }).count
      if (rps > 0) slots.push({ day: Number(parts[0]), hour: Number(parts[1]), rps, count, ws: weightedScore(rps, count) })
    }
    return slots.sort((a, b) => b.ws - a.ws).slice(0, 3)
  }, [effectiveData])

  return (
    <Panel>
      <div className="flex items-center justify-between mb-1">
        <SectionLabel>Day &amp; Time Heatmap <span className="text-[10px] text-white/40 font-normal ml-1">(EST)</span></SectionLabel>
        {available.length > 1 && <PostTypeSelector value={filter} onChange={setFilter} available={available} />}
      </div>
      <div ref={ref} className="overflow-x-auto" />
      {topSlots.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {topSlots.map((slot, i) => (
            <div key={i} className="text-[12px] text-white/80">
              #{i + 1}: <span className="text-green-400 font-medium">{DAY_NAMES[slot.day]} at {slot.hour}:00</span>
              <span className="text-white/50 ml-1">({slot.rps.toFixed(2)} RPS, {slot.count} post{slot.count !== 1 ? 's' : ''})</span>
            </div>
          ))}
        </div>
      )}
      <Insight text="Numbers inside cells = posts published in that slot. Colors use percentile ranking — each slot is colored by its rank among all slots, not raw RPS, so outliers don't skew the scale. Ranking uses a weighted score that rewards consistency (more posts = more reliable). Green = consistently best, red = consistently worst." />
    </Panel>
  )
}

function EngagementTrend({
  data,
  inflections,
  posts,
  sharedMonths,
}: {
  data: { month: string; avg_engagement: number; post_count: number }[] | null
  inflections: any[] | null
  posts: Record<string, any>[]
  sharedMonths?: string[]
}) {
  const [filter, setFilter] = useState<PostTypeFilter>('all')
  const [excludeViral, setExcludeViral] = useState(false)
  const available = useMemo(() => availablePostTypes(posts), [posts])

  const effectiveData = useMemo(() => {
    const useCustom = filter !== 'all' || excludeViral
    const raw = useCustom
      ? computeEngagementTrend(
          excludeViral ? posts.filter((p) => p.viral_classification !== 'viral') : posts,
          filter
        )
      : data
    if (!raw || raw.length === 0) return null
    if (!sharedMonths) return raw
    // Pad to shared months
    const byMonth = Object.fromEntries(raw.map((d) => [d.month.slice(0, 7), d]))
    return sharedMonths.map((m) => byMonth[m] ?? { month: m, avg_engagement: 0, post_count: 0 })
  }, [data, posts, filter, sharedMonths, excludeViral])

  if (!effectiveData || effectiveData.length < 2) return null

  const chartData = {
    labels: effectiveData.map((d) => d.month.slice(0, 7)),
    datasets: [
      {
        label: 'Avg Engagement',
        data: effectiveData.map((d) => d.avg_engagement),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        yAxisID: 'y',
      },
      {
        label: 'Post Count',
        data: effectiveData.map((d) => d.post_count),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0)',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        borderDash: [4, 2],
        yAxisID: 'y1',
      },
    ],
  }
  return (
    <Panel>
      <div className="flex items-center justify-between mb-1">
        <SectionLabel>Engagement Trend</SectionLabel>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExcludeViral(!excludeViral)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${excludeViral ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'}`}
          >
            {excludeViral ? 'Viral excluded' : 'Exclude viral'}
          </button>
          {available.length > 1 && <PostTypeSelector value={filter} onChange={setFilter} available={available} />}
        </div>
      </div>
      <div className="h-40">
        <Line data={chartData} options={{
          ...CHART_OPTS_COMPACT,
          scales: {
            x: { ...CHART_OPTS_COMPACT.scales.x },
            y: { ...CHART_OPTS_COMPACT.scales.y, position: 'left' as const },
            y1: { ...CHART_OPTS_COMPACT.scales.y, position: 'right' as const, grid: { display: false } },
          },
        }} />
      </div>
      {inflections && inflections.length > 0 && filter === 'all' && (
        <div className="flex flex-wrap gap-1 mt-2">
          {inflections.map((p: any, i: number) => (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium cursor-default ${p.change_pct > 0 ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}
              onMouseMove={(e) => showTip(e.clientX, e.clientY, `${p.month}: ${p.change_pct > 0 ? '+' : ''}${p.change_pct.toFixed(0)}% engagement shift\n${p.change_pct > 0 ? 'Positive inflection — something worked here.' : 'Negative inflection — review what changed.'}`)}
              onMouseLeave={hideTip}
            >
              {p.month}: {p.change_pct > 0 ? '+' : ''}{p.change_pct.toFixed(0)}%
            </span>
          ))}
        </div>
      )}
      <Insight text="Blue = avg engagement per post (left axis). Purple dashed = post count (right axis). When they diverge, quality is changing faster than quantity." />
    </Panel>
  )
}

// ── Content evolution ────────────────────────────────────────────────────────

// ── Pillar & Format Shift Impact Analysis ───────────────────────────────────

function PillarFormatImpactPanel({ metrics }: { metrics: Record<string, any> }) {
  const trend = metrics.engagement_trend as { month: string; avg_engagement: number; post_count: number }[] | null
  const pillarDrift = metrics.pillar_drift as Record<string, Record<string, number>> | null
  const formatDist = metrics.format_distribution_over_time as Record<string, Record<string, number>> | null

  if (!trend || trend.length < 2) return null
  const trendData = trend // non-null bind for nested functions

  // Compute engagement deltas for 1mo, 3mo, 6mo windows
  function getEngagementDelta(monthsBack: number): { pct: number; label: string } | null {
    if (trendData.length < monthsBack + 1) return null
    const recent = trendData[trendData.length - 1]
    const older = trendData[trendData.length - 1 - monthsBack]
    if (!recent || !older || !older.avg_engagement) return null
    const pct = ((recent.avg_engagement - older.avg_engagement) / older.avg_engagement) * 100
    return { pct, label: `${monthsBack}mo` }
  }

  // Identify top pillar shifts for a window
  function getTopShifts(data: Record<string, Record<string, number>> | null | undefined, monthsBack: number): { name: string; delta: number }[] {
    if (!data) return []
    const months = Object.keys(data).sort()
    if (months.length < monthsBack + 1) return []
    const recent = data[months[months.length - 1]] || {}
    const older = data[months[months.length - 1 - monthsBack]] || {}
    const shifts: { name: string; delta: number }[] = []
    const allKeys = new Set([...Object.keys(recent), ...Object.keys(older)])
    for (const k of allKeys) {
      if (GENERIC_KEYS.has(k.trim())) continue
      const delta = ((recent[k] ?? 0) - (older[k] ?? 0)) * 100
      if (Math.abs(delta) >= 3) shifts.push({ name: k, delta })
    }
    shifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    return shifts.slice(0, 3)
  }

  const windows = [1, 3, 6]
  const engagementDeltas = windows.map(getEngagementDelta).filter(Boolean) as { pct: number; label: string }[]
  if (engagementDeltas.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Pillar Shift Impact */}
      <Panel>
        <SectionLabel>Pillar Shift Impact</SectionLabel>
        <p className="text-[10px] text-white/40 mb-3">How content pillar changes correlate with engagement</p>
        <div className="space-y-3">
          {engagementDeltas.map(({ pct, label }) => {
            const monthsBack = parseInt(label)
            const shifts = getTopShifts(pillarDrift, monthsBack)
            const isUp = pct > 0
            return (
              <div key={label} className="rounded-md bg-[var(--bg-tertiary)] p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-white/50 font-medium uppercase w-8">{label}</span>
                  <span className={`text-sm font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{pct.toFixed(1)}% engagement
                  </span>
                </div>
                {shifts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shifts.map((s) => (
                      <span key={s.name} className={`text-[10px] px-1.5 py-0.5 rounded ${s.delta > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {prettyLabel(s.name)} {s.delta > 0 ? '+' : ''}{s.delta.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 italic">No significant shifts</span>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Format Shift Impact */}
      <Panel>
        <SectionLabel>Format Shift Impact</SectionLabel>
        <p className="text-[10px] text-white/40 mb-3">How format distribution changes correlate with engagement</p>
        <div className="space-y-3">
          {engagementDeltas.map(({ pct, label }) => {
            const monthsBack = parseInt(label)
            const shifts = getTopShifts(formatDist, monthsBack)
            const isUp = pct > 0
            return (
              <div key={label} className="rounded-md bg-[var(--bg-tertiary)] p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-white/50 font-medium uppercase w-8">{label}</span>
                  <span className={`text-sm font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{pct.toFixed(1)}% engagement
                  </span>
                </div>
                {shifts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {shifts.map((s) => (
                      <span key={s.name} className={`text-[10px] px-1.5 py-0.5 rounded ${s.delta > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {prettyLabel(s.name)} {s.delta > 0 ? '+' : ''}{s.delta.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 italic">No significant shifts</span>
                )}
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}


// Custom Chart.js plugin for post count overlays on stacked bars
function makePostCountPlugin(postCountsByMonth: Record<string, number>) {
  return {
    id: 'barCountLabels',
    afterDraw(chart: any) {
      const ctx = chart.ctx
      const labels = chart.data.labels as string[]
      if (!labels) return
      const dsCount = chart.data.datasets.length
      if (dsCount === 0) return
      labels.forEach((label: string, i: number) => {
        const count = postCountsByMonth[label] ?? 0
        if (count === 0) return
        // Find the topmost visible bar for this index
        let topY = Infinity
        let barX = 0
        for (let ds = 0; ds < dsCount; ds++) {
          const meta = chart.getDatasetMeta(ds)
          if (meta.hidden) continue
          const bar = meta.data[i]
          if (bar && bar.y < topY) {
            topY = bar.y
            barX = bar.x
          }
        }
        if (topY === Infinity) return
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(count), barX, topY - 4)
        ctx.restore()
      })
    },
  }
}

function PillarDrift({
  data,
  height = 160,
  sharedMonths,
  posts,
}: {
  data: Record<string, Record<string, number>> | null
  height?: number
  sharedMonths?: string[]
  posts: Record<string, any>[]
}) {
  if (!data) return null
  const months = sharedMonths ?? Object.keys(data).sort()
  if (months.length === 0) return null

  const pillarTotals: Record<string, number> = {}
  for (const mo of months) for (const [k, v] of Object.entries(data[mo] ?? {})) pillarTotals[k] = (pillarTotals[k] ?? 0) + v
  const allPillars = filterGeneric(Object.entries(pillarTotals)).sort((a, b) => b[1] - a[1]).map(([p]) => p)

  const postCountsByMonth = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      if (p.posted_at) {
        const mo = (p.posted_at as string).slice(0, 7)
        counts[mo] = (counts[mo] ?? 0) + 1
      }
    }
    return counts
  }, [posts])

  const chartData = {
    labels: months.map((mo) => mo.slice(0, 7)),
    datasets: allPillars.map((p, i) => ({
      label: prettyLabel(p),
      data: months.map((mo) => Math.round((data[mo]?.[p] ?? 0) * 100)),
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      stack: 'stack',
    })),
  }
  return (
    <Panel>
      <SectionLabel>Content Pillar Drift</SectionLabel>
      <div style={{ height }}>
        <Bar data={chartData} options={{
          ...CHART_OPTS_COMPACT,
          maintainAspectRatio: false,
          scales: {
            x: { ...CHART_OPTS_COMPACT.scales.x, stacked: true },
            y: { ...CHART_OPTS_COMPACT.scales.y, stacked: true, max: 100, ticks: { ...CHART_OPTS_COMPACT.scales.y.ticks, callback: (v: any) => `${v}%` } },
          },
          plugins: {
            ...CHART_OPTS_COMPACT.plugins,
            legend: { display: false },
          },
        }} plugins={[makePostCountPlugin(postCountsByMonth)]} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
        {allPillars.map((p, i) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-[10px] text-white/70">{prettyLabel(p)}</span>
            <span className="text-[9px] text-white/40">{Math.round((pillarTotals[p] / months.length) * 100)}%</span>
          </div>
        ))}
      </div>
      <Insight text="How your content topic mix has shifted month to month. Post counts shown above bars. Sudden shifts often explain engagement changes." />
    </Panel>
  )
}

function FormatMigration({
  data,
  height = 160,
  sharedMonths,
  posts,
}: {
  data: Record<string, Record<string, number>> | null
  height?: number
  sharedMonths?: string[]
  posts: Record<string, any>[]
}) {
  if (!data) return null
  const months = sharedMonths ?? Object.keys(data).sort()
  if (months.length === 0) return null
  const allFormats = filterGeneric([...new Set(months.flatMap((mo) => Object.keys(data[mo] ?? {})))].map((f) => [f, 0] as [string, number])).map(([f]) => f)

  const postCountsByMonth = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      if (p.posted_at) {
        const mo = (p.posted_at as string).slice(0, 7)
        counts[mo] = (counts[mo] ?? 0) + 1
      }
    }
    return counts
  }, [posts])

  const chartData = {
    labels: months.map((mo) => mo.slice(0, 7)),
    datasets: allFormats.map((f, i) => ({
      label: f,
      data: months.map((mo) => Math.round((data[mo]?.[f] ?? 0) * 100)),
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      stack: 'stack',
    })),
  }
  return (
    <ChartPanel
      title="Format Distribution Over Time"
      height={height}
      insight="How your content format mix has evolved. Post counts shown above bars. Format pivots (e.g. shifting from carousels to reels) often drive engagement spikes or drops."
    >
      <Bar data={chartData} options={{
        ...CHART_OPTS_COMPACT,
        scales: {
          x: { ...CHART_OPTS_COMPACT.scales.x, stacked: true },
          y: { ...CHART_OPTS_COMPACT.scales.y, stacked: true, max: 100, ticks: { ...CHART_OPTS_COMPACT.scales.y.ticks, callback: (v: any) => `${v}%` } },
        },
        plugins: {
          ...CHART_OPTS_COMPACT.plugins,
          legend: { display: true, position: 'bottom' as const, labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 }, boxWidth: 10, padding: 6 } },
        },
      }} plugins={[makePostCountPlugin(postCountsByMonth)]} />
    </ChartPanel>
  )
}

// ── Bottom row ───────────────────────────────────────────────────────────────

function BestWorstBreakdown({ data }: { data: any }) {
  if (!data) return null
  const { best, worst } = data
  return (
    <Panel>
      <SectionLabel>Best vs Worst Posts</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-semibold text-green-400 uppercase tracking-wider mb-2">Top 5</div>
          <div className="space-y-1 text-[11px]">
            <div><span className="text-white/50">Hook:</span> <span className="text-white">{best.common_hook || '\u2014'}</span></div>
            <div><span className="text-white/50">Format:</span> <span className="text-white">{best.common_format || '\u2014'}</span></div>
            <div><span className="text-white/50">Pillar:</span> <span className="text-white">{best.common_pillar || '\u2014'}</span></div>
            <div><span className="text-white/50">Caption:</span> <span className="text-white">{best.avg_caption_length} chars</span></div>
            <div><span className="text-white/50">Hour:</span> <span className="text-white">{best.avg_hour}:00</span></div>
          </div>
          {best.posts && (
            <div className="mt-2 space-y-0.5">
              {best.posts.slice(0, 3).map((p: any) => (
                <div key={p.id}
                  className="text-[11px] text-white/70 truncate cursor-default"
                  onMouseMove={(e) => showTip(e.clientX, e.clientY, `RPS: ${p.rps.toFixed(2)}x\nHook: ${p.hook || 'No hook'}`)}
                  onMouseLeave={hideTip}
                >
                  <span className="text-green-400 font-bold">{p.rps.toFixed(1)}x</span> {p.hook || 'No hook'}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-2">Bottom 5</div>
          <div className="space-y-1 text-[11px]">
            <div><span className="text-white/50">Hook:</span> <span className="text-white">{worst.common_hook || '\u2014'}</span></div>
            <div><span className="text-white/50">Format:</span> <span className="text-white">{worst.common_format || '\u2014'}</span></div>
            <div><span className="text-white/50">Pillar:</span> <span className="text-white">{worst.common_pillar || '\u2014'}</span></div>
            <div><span className="text-white/50">Caption:</span> <span className="text-white">{worst.avg_caption_length} chars</span></div>
            <div><span className="text-white/50">Hour:</span> <span className="text-white">{worst.avg_hour}:00</span></div>
          </div>
          {worst.posts && (
            <div className="mt-2 space-y-0.5">
              {worst.posts.slice(0, 3).map((p: any) => (
                <div key={p.id}
                  className="text-[11px] text-white/70 truncate cursor-default"
                  onMouseMove={(e) => showTip(e.clientX, e.clientY, `RPS: ${p.rps.toFixed(2)}x\nHook: ${p.hook || 'No hook'}`)}
                  onMouseLeave={hideTip}
                >
                  <span className="text-red-400 font-bold">{p.rps.toFixed(1)}x</span> {p.hook || 'No hook'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Insight text="What your top 5 and bottom 5 posts have in common. Use top patterns as a recipe; avoid bottom patterns." />
    </Panel>
  )
}

function SeriesDetection({ series }: { series: any[] | null }) {
  if (!series || series.length === 0) return null
  const validSeries = series.filter((s: any) => s.name && !/^\{.*\}$/.test(s.name))
  if (validSeries.length === 0) return null
  return (
    <Panel>
      <SectionLabel>Content Series Detected</SectionLabel>
      <div className="space-y-2">
        {validSeries.slice(0, 5).map((s: any, i: number) => (
          <div key={i} className="flex items-start gap-2 cursor-default"
            onMouseMove={(e) => showTip(e.clientX, e.clientY, `"${s.name}"\n${s.post_count} posts in this series\n\n${s.description}`)}
            onMouseLeave={hideTip}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-white">{s.name}
                <span className="text-white/50 font-normal ml-1">({s.post_count} posts)</span>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
      <Insight text="AI-detected recurring themes. Series build audience expectation and loyalty — lean into what's already working." />
    </Panel>
  )
}

function formatAnalysisTip(a: Record<string, unknown>): string {
  const lines: string[] = []
  if (a.post_purpose) lines.push(`Purpose: ${a.post_purpose}`)
  if (a.content_pillar) lines.push(`Pillar: ${a.content_pillar}`)
  if (a.visual_style) lines.push(`Visual: ${a.visual_style}`)
  if (a.sentiment) lines.push(`Sentiment: ${a.sentiment}`)
  if (a.cta_type) lines.push(`CTA: ${a.cta_type}`)
  if (a.estimated_production_effort) lines.push(`Effort: ${a.estimated_production_effort}`)
  if (a.hook) lines.push(`\nHook: "${a.hook}"`)
  if (a.target_audience) lines.push(`Audience: ${a.target_audience}`)
  return lines.join('\n')
}

function VisualConsistency({ score, notes, posts, analysisMap }: {
  score: number | null
  notes: string | null
  posts: Record<string, any>[]
  analysisMap?: Map<string, Record<string, unknown>>
}) {
  if (score == null && posts.length === 0) return null
  const color = score == null ? '#6b7280' : score >= 7 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'
  const label = score == null ? '\u2014' : score >= 7 ? 'Strong' : score >= 5 ? 'Moderate' : 'Weak'
  return (
    <Panel>
      <SectionLabel>Visual Consistency</SectionLabel>
      {score != null && (
        <div className="flex items-center gap-3 mb-3"
          onMouseMove={(e) => showTip(e.clientX, e.clientY, `Visual Consistency: ${score.toFixed(1)}/10 (${label})\n\nConsistent visuals build brand recognition and make your content instantly recognizable in the feed.`)}
          onMouseLeave={hideTip}
        >
          <div className="text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</div>
          <div>
            <div className="text-xs font-medium text-white">{label}</div>
            <div className="text-[11px] text-white/60">out of 10</div>
          </div>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, backgroundColor: color }} />
          </div>
        </div>
      )}
      {posts.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 mb-3">
          {posts.map((post: any) => {
            const url = post.image_url || storageUrl(post.image_storage_path)
            const analysis = analysisMap?.get(post.id)
            const tip = analysis
              ? `@${post.profile_handle} · ${post.content_type}\n\n${formatAnalysisTip(analysis)}`
              : `@${post.profile_handle} · ${post.content_type}\n\nNo AI analysis`
            return (
              <div
                key={post.id}
                className="aspect-square rounded overflow-hidden bg-white/5 relative group"
                onMouseMove={(e) => showTip(e.clientX, e.clientY, tip)}
                onMouseLeave={hideTip}
              >
                {url && <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />}
                {analysis && (
                  <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded-full bg-purple-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Brain size={8} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {notes && <p className="text-[11px] text-white leading-relaxed">{notes}</p>}
      <Insight text="AI assessment of thumbnail and visual style consistency. Consistent visuals = stronger brand recognition." />
    </Panel>
  )
}

function HighResonancePosts({ posts }: { posts: any[] | null }) {
  if (!posts || posts.length === 0) return null
  return (
    <Panel>
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle size={12} className="text-blue-400" />
        <SectionLabel>High Resonance Posts</SectionLabel>
      </div>
      <Insight text="Posts with the highest comment-to-like ratio — meaning they sparked real conversation, not just passive likes. These reveal your most emotionally engaging topics." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 mt-2">
        {posts.slice(0, 8).map((p: any, i: number) => (
          <div key={i}
            className="flex items-start gap-2 p-2 rounded-md bg-[var(--bg-tertiary)] cursor-default"
            onMouseMove={(e) => showTip(e.clientX, e.clientY, `Comment:Like ratio: ${p.comment_like_ratio.toFixed(4)}\nHigh ratio = strong audience reaction.\n\n${p.caption || 'No caption'}`)}
            onMouseLeave={hideTip}
          >
            <span className="text-[11px] text-white/60 mt-0.5 w-4 shrink-0">#{i + 1}</span>
            <p className="text-[11px] text-white leading-relaxed flex-1 truncate">{p.caption || 'No caption'}</p>
            <span className="text-[12px] font-bold text-blue-400 shrink-0">{p.comment_like_ratio.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function WorstPerformingPosts({ posts }: { posts: Record<string, any>[] }) {
  const worst = useMemo(() =>
    posts
      .filter((p) => p.relative_performance_score != null && p.caption)
      .sort((a, b) => a.relative_performance_score! - b.relative_performance_score!)
      .slice(0, 8),
    [posts]
  )

  if (worst.length === 0) return null

  return (
    <Panel>
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown size={12} className="text-red-400" />
        <SectionLabel>Worst Performing Posts</SectionLabel>
      </div>
      <Insight text="Posts with the lowest RPS (Relative Performance Score). These underperformed compared to the creator's average. Look for patterns in timing, format, or topic." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 mt-2">
        {worst.map((p: any, i: number) => (
          <div
            key={p.id}
            className="flex items-start gap-2 p-2 rounded-md bg-[var(--bg-tertiary)] cursor-default"
            onMouseMove={(e) =>
              showTip(e.clientX, e.clientY,
                `RPS: ${p.relative_performance_score!.toFixed(3)}\nFormat: ${p.content_type}\nPosted: ${p.posted_at?.slice(0, 10) ?? 'Unknown'}\n\n${p.caption || 'No caption'}`
              )
            }
            onMouseLeave={hideTip}
          >
            <span className="text-[11px] text-white/60 mt-0.5 w-4 shrink-0">#{i + 1}</span>
            <p className="text-[11px] text-white leading-relaxed flex-1 truncate">{p.caption || 'No caption'}</p>
            <span className="text-[12px] font-bold text-red-400 shrink-0">{p.relative_performance_score!.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
