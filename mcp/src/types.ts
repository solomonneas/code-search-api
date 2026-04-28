export type SearchMode = "hybrid" | "code" | "summary";

export interface SearchRequest {
  query: string;
  mode?: SearchMode;
  project?: string;
  limit?: number;
  min_score?: number;
}

export interface SearchResult {
  score: number;
  code_score: number;
  summary_score: number | null;
  file_path: string;
  project: string;
  chunk_index: number;
  chunk_type: string;
  summary: string | null;
  content: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total_matches: number;
  mode: SearchMode;
}

export interface ProjectSummary {
  project: string;
  chunks: number;
  embedded: number;
  summarized: number;
}

export interface ProjectsResponse {
  projects: ProjectSummary[];
}

export interface HealthResponse {
  status: "ok" | "degraded" | string;
  version: string;
  chunks?: number;
  embedded?: number;
  summarized?: number;
  summary_embedded?: number;
  query_cache_size?: number;
  error?: string;
}

export interface StatsResponse {
  total_chunks: number;
  by_type: Record<string, number>;
  by_project: Array<{
    project: string;
    total: number;
    summarized: number;
    pct: number;
  }>;
}

export interface SummaryStatsResponse {
  total_chunks: number;
  summarized: number;
  pending: number;
  by_model: Record<string, number>;
}
