"use client";

import { useState, useEffect } from "react";
import { clientApi } from "@/lib/api";
import type { ArtifactComment } from "@/lib/types";

export default function CommentsPanel({
  artifactId,
}: {
  artifactId: string;
}) {
  const [comments, setComments] = useState<ArtifactComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [artifactId]);

  async function loadComments() {
    try {
      const data = await clientApi<{ comments: ArtifactComment[] }>(
        `/artifacts/${artifactId}/comments`
      );
      setComments(data.comments || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await clientApi(`/artifacts/${artifactId}/comments`, {
        method: "POST",
        body: { content: content.trim() },
      });
      setContent("");
      loadComments();
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Comments</h3>

      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] mb-4">No comments yet</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-[var(--border-color)] pl-3">
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-1">
                <span className="font-medium text-[var(--text-secondary)]">
                  {c.author_name}
                </span>
                <span>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--text-muted)]"
          disabled={posting}
        />
        <button
          type="submit"
          disabled={posting || !content.trim()}
          className="px-4 py-2 text-sm rounded-md bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
