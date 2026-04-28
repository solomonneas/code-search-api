import type {
  HealthResponse,
  ProjectsResponse,
  SearchRequest,
  SearchResponse,
  StatsResponse,
  SummaryStatsResponse,
} from "./types.js";
import type { CodeSearchConfig } from "./config.js";

const REQUEST_TIMEOUT_MS = 30_000;

export class CodeSearchClient {
  constructor(private readonly config: CodeSearchConfig) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(`${this.config.url}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        const detail = text ? `: ${text.slice(0, 500)}` : "";
        if (response.status === 401 || response.status === 403) {
          throw new Error(`code-search-api rejected the request. Check CODE_SEARCH_API_KEY${detail}`);
        }
        throw new Error(`code-search-api HTTP ${response.status} for ${path}${detail}`);
      }

      return (text ? JSON.parse(text) : undefined) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request to ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  search(payload: SearchRequest): Promise<SearchResponse> {
    return this.request<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  listProjects(): Promise<ProjectsResponse> {
    return this.request<ProjectsResponse>("/api/projects");
  }

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  stats(): Promise<StatsResponse> {
    return this.request<StatsResponse>("/api/stats");
  }

  summaryStats(): Promise<SummaryStatsResponse> {
    return this.request<SummaryStatsResponse>("/api/summary-stats");
  }
}
