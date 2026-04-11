"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Artifact } from "@/lib/types";

export default function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  // If artifact has self-contained HTML (dashboards), render it
  if (artifact.content_html) {
    return (
      <div
        className="bg-white rounded-xl border p-6"
        dangerouslySetInnerHTML={{ __html: artifact.content_html }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Sections view */}
      {artifact.sections && artifact.sections.length > 0 ? (
        artifact.sections.map((section, i) => (
          <div key={i} className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-gray-900">{section.label}</h3>
              {section.agent && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {section.agent}
                </span>
              )}
            </div>
            {section.output && (
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.output}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))
      ) : artifact.content_markdown ? (
        <div className="bg-white rounded-xl border p-6">
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {artifact.content_markdown}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-6 text-gray-400 text-center">
          No content available
        </div>
      )}
    </div>
  );
}
