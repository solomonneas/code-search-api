import { describe, expect, it, vi } from "vitest";
import { registerCodeSearchTools } from "../src/tools/code-search.js";
import type { CodeSearchClient } from "../src/client.js";

interface CapturedTool {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }>;
}

function makeFakeServer(): { server: unknown; tools: Map<string, CapturedTool> } {
  const tools = new Map<string, CapturedTool>();
  const server = {
    tool: (
      name: string,
      _description: string,
      _schema: unknown,
      handler: CapturedTool["handler"],
    ) => {
      tools.set(name, { name, handler });
    },
  };
  return { server, tools };
}

describe("code-search tool handlers", () => {
  it("registers only read-only tools", () => {
    const client = {} as CodeSearchClient;
    const { server, tools } = makeFakeServer();

    registerCodeSearchTools(server as never, client);

    expect([...tools.keys()].sort()).toEqual([
      "code_search_stats",
      "health",
      "list_projects",
      "search_code",
    ]);
    expect(tools.has("index")).toBe(false);
    expect(tools.has("backfill_summaries")).toBe(false);
  });

  it("passes search arguments through with safe defaults", async () => {
    const client = {
      search: vi.fn().mockResolvedValue({
        results: [],
        total_matches: 0,
        mode: "hybrid",
      }),
    } as unknown as CodeSearchClient;
    const { server, tools } = makeFakeServer();
    registerCodeSearchTools(server as never, client);

    const result = await tools.get("search_code")!.handler({
      query: "auth middleware",
      project: "api",
    });

    expect(result.isError).toBeUndefined();
    expect(client.search).toHaveBeenCalledWith({
      query: "auth middleware",
      mode: "hybrid",
      project: "api",
      limit: 10,
      min_score: 0.3,
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      results: [],
      total_matches: 0,
      mode: "hybrid",
    });
  });

  it("combines detailed and summary stats", async () => {
    const client = {
      stats: vi.fn().mockResolvedValue({
        total_chunks: 12,
        by_type: { block: 12 },
        by_project: [],
      }),
      summaryStats: vi.fn().mockResolvedValue({
        total_chunks: 12,
        summarized: 8,
        pending: 4,
        by_model: { "qwen3-coder-next:cloud": 8 },
      }),
    } as unknown as CodeSearchClient;
    const { server, tools } = makeFakeServer();
    registerCodeSearchTools(server as never, client);

    const result = await tools.get("code_search_stats")!.handler({});

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      stats: {
        total_chunks: 12,
        by_type: { block: 12 },
        by_project: [],
      },
      summary_stats: {
        total_chunks: 12,
        summarized: 8,
        pending: 4,
        by_model: { "qwen3-coder-next:cloud": 8 },
      },
    });
  });

  it("surfaces client errors as MCP errors", async () => {
    const client = {
      health: vi.fn().mockRejectedValue(new Error("connection refused")),
    } as unknown as CodeSearchClient;
    const { server, tools } = makeFakeServer();
    registerCodeSearchTools(server as never, client);

    const result = await tools.get("health")!.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("connection refused");
  });
});
