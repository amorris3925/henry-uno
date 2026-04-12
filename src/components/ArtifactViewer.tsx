"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Artifact } from "@/lib/types";

export default function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  if (artifact.content_html) {
    return (
      <div
        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
        dangerouslySetInnerHTML={{ __html: artifact.content_html }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {artifact.sections && artifact.sections.length > 0 ? (
        artifact.sections.map((section, i) => (
          <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.label}</h3>
              {section.agent && (
                <span className="text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] px-2 py-0.5 rounded-full">
                  {section.agent}
                </span>
              )}
            </div>
            {section.output && (
              <div className="prose prose-sm prose-invert max-w-none text-[var(--text-secondary)] [&_h1]:text-[var(--text-primary)] [&_h2]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)] [&_strong]:text-[var(--text-primary)] [&_a]:text-[var(--color-accent)] [&_code]:bg-[var(--bg-tertiary)] [&_code]:text-[var(--text-secondary)] [&_pre]:bg-[var(--bg-primary)] [&_pre]:border [&_pre]:border-[var(--border-color)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.output}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))
      ) : artifact.content_markdown ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <div className="prose prose-sm prose-invert max-w-none text-[var(--text-secondary)] [&_h1]:text-[var(--text-primary)] [&_h2]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)] [&_strong]:text-[var(--text-primary)] [&_a]:text-[var(--color-accent)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {artifact.content_markdown}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-[var(--text-muted)] text-center text-sm">
          No content available
        </div>
      )}
    </div>
  );
}
