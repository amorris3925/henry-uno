"use client";

import { useMemo, useState } from "react";
import type { ArtifactListItem } from "@/lib/types";
import ArtifactCard from "@/components/ArtifactCard";

// Known structured tag prefixes → human-friendly group labels.
const TAG_GROUPS: { prefix: string; label: string }[] = [
  { prefix: "audience:", label: "Audience" },
  { prefix: "client:", label: "Client" },
  { prefix: "repo:", label: "Source repo" },
  { prefix: "source:", label: "Source" },
];

const GENERIC_GROUP = "Tags";

function stripPrefix(tag: string): string {
  const idx = tag.indexOf(":");
  return idx >= 0 ? tag.slice(idx + 1) : tag;
}

function groupForTag(tag: string): string {
  const g = TAG_GROUPS.find((grp) => tag.startsWith(grp.prefix));
  return g ? g.label : GENERIC_GROUP;
}

export default function ArtifactsBrowser({
  artifacts,
}: {
  artifacts: ArtifactListItem[];
}) {
  const [query, setQuery] = useState("");
  // Selected facet values, keyed by group label.
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [tagFilters, setTagFilters] = useState<Map<string, Set<string>>>(
    new Map()
  );

  // Faceted options derived from the data.
  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of artifacts) if (a.artifact_type) s.add(a.artifact_type);
    return Array.from(s).sort();
  }, [artifacts]);

  // Tag facets grouped by prefix. Map<groupLabel, Map<fullTag, displayLabel>>.
  const tagGroups = useMemo(() => {
    const groups = new Map<string, Map<string, string>>();
    for (const a of artifacts) {
      for (const tag of a.tags || []) {
        const group = groupForTag(tag);
        if (!groups.has(group)) groups.set(group, new Map());
        groups.get(group)!.set(tag, stripPrefix(tag));
      }
    }
    // Stable group ordering: known prefixes first (in declared order), then generic.
    const ordered: { label: string; values: { tag: string; display: string }[] }[] = [];
    for (const g of TAG_GROUPS) {
      const m = groups.get(g.label);
      if (m) {
        ordered.push({
          label: g.label,
          values: Array.from(m, ([tag, display]) => ({ tag, display })).sort(
            (x, y) => x.display.localeCompare(y.display)
          ),
        });
      }
    }
    const generic = groups.get(GENERIC_GROUP);
    if (generic) {
      ordered.push({
        label: GENERIC_GROUP,
        values: Array.from(generic, ([tag, display]) => ({ tag, display })).sort(
          (x, y) => x.display.localeCompare(y.display)
        ),
      });
    }
    return ordered;
  }, [artifacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artifacts.filter((a) => {
      // Text search across title + summary + tags.
      if (q) {
        const haystack = [
          a.title,
          a.summary || "",
          ...(a.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Type facet: OR within the group.
      if (typeFilters.size > 0) {
        if (!a.artifact_type || !typeFilters.has(a.artifact_type)) return false;
      }

      // Tag facets: AND across groups, OR within a group.
      for (const [, selected] of tagFilters) {
        if (selected.size === 0) continue;
        const tags = a.tags || [];
        const hit = tags.some((t) => selected.has(t));
        if (!hit) return false;
      }

      return true;
    });
  }, [artifacts, query, typeFilters, tagFilters]);

  const activeFilterCount =
    typeFilters.size +
    Array.from(tagFilters.values()).reduce((n, s) => n + s.size, 0);
  const hasFilters = query.trim().length > 0 || activeFilterCount > 0;

  function toggleType(value: string) {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleTag(group: string, tag: string) {
    setTagFilters((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(group) || []);
      if (set.has(tag)) set.delete(tag);
      else set.add(tag);
      if (set.size === 0) next.delete(group);
      else next.set(group, set);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setTypeFilters(new Set());
    setTagFilters(new Map());
  }

  const chipBase =
    "text-[11px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer";
  const chipOff =
    "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]";
  const chipOn =
    "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]";

  return (
    <div>
      {/* Search + controls */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, summary, or tag…"
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {(typeOptions.length > 0 || tagGroups.length > 0) && (
          <div className="space-y-2">
            {typeOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mr-1">
                  Type
                </span>
                {typeOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`${chipBase} ${typeFilters.has(t) ? chipOn : chipOff}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {tagGroups.map((group) => (
              <div key={group.label} className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mr-1">
                  {group.label}
                </span>
                {group.values.map(({ tag, display }) => {
                  const selected = tagFilters.get(group.label)?.has(tag) ?? false;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(group.label, tag)}
                      className={`${chipBase} ${selected ? chipOn : chipOff}`}
                    >
                      {display}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            {filtered.length} of {artifacts.length} shown
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-16 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No artifacts match your filters.
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs text-[var(--color-accent)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <ArtifactCard key={a.id} artifact={a} />
          ))}
        </div>
      )}
    </div>
  );
}
