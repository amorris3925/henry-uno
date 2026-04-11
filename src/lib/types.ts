export interface Artifact {
  id: string;
  title: string;
  slug: string | null;
  artifact_type: string | null;
  artifact_subtype: string | null;
  content_markdown: string | null;
  content_html: string | null;
  sections: Section[] | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  widgets: unknown[] | null;
  created_at: string;
  updated_at: string | null;
  portal_shared_at: string | null;
  portal_shared_by: string | null;
}

export interface ArtifactListItem {
  id: string;
  title: string;
  slug: string | null;
  artifact_type: string | null;
  summary: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
  portal_shared_at: string | null;
  portal_shared_by: string | null;
}

export interface Section {
  label: string;
  agent?: string;
  status?: string;
  output?: string;
  duration_ms?: number;
  tokens?: number;
}

export interface ArtifactComment {
  id: string;
  artifact_id: string;
  author_email: string;
  author_name: string;
  content: string;
  section_index: number | null;
  created_at: string;
}

export interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version_number: number;
  title: string;
  summary: string | null;
  snapshot_at: string;
}
