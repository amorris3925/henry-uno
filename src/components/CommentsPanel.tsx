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
    <div className="bg-white rounded-xl border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No comments yet</p>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="border-l-2 border-gray-200 pl-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span className="font-medium text-gray-600">
                  {c.author_name}
                </span>
                <span>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
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
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-henry-500 focus:border-henry-500 outline-none"
          disabled={posting}
        />
        <button
          type="submit"
          disabled={posting || !content.trim()}
          className="px-4 py-2 bg-henry-500 text-white text-sm rounded-lg font-medium hover:bg-henry-600 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
