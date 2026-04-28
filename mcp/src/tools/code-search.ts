import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CodeSearchClient } from "../client.js";
import type { SearchMode } from "../types.js";
import { fail, ok } from "./_util.js";

export function registerCodeSearchTools(server: McpServer, client: CodeSearchClient): void {
  server.tool(
    "search_code",
    "Search the indexed local codebase by developer intent using hybrid semantic search. Read-only.",
    {
      query: z.string().min(1).describe("Natural-language description of the code, behavior, symbol, or workflow to find."),
      mode: z
        .enum(["hybrid", "code", "summary"])
        .default("hybrid")
        .describe("Search mode. hybrid combines code and summary vectors, code searches code embeddings, summary searches summary embeddings."),
      project: z.string().min(1).optional().describe("Optional exact project filter from list_projects."),
      limit: z.number().int().min(1).max(50).default(10).describe("Maximum results to return, 1 to 50."),
      min_score: z.number().min(0).max(1).default(0.3).describe("Minimum similarity score, 0 to 1."),
    },
    async ({ query, mode = "hybrid", project, limit = 10, min_score = 0.3 }) => {
      try {
        return ok(
          await client.search({
            query,
            mode: mode as SearchMode,
            project,
            limit,
            min_score,
          }),
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "list_projects",
    "List projects currently present in the code-search-api index with chunk, embedding, and summary counts. Read-only.",
    {},
    async () => {
      try {
        return ok(await client.listProjects());
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "code_search_stats",
    "Return code-search-api index health statistics, including chunk coverage and summary model coverage. Read-only.",
    {},
    async () => {
      try {
        const [stats, summaryStats] = await Promise.all([client.stats(), client.summaryStats()]);
        return ok({ stats, summary_stats: summaryStats });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.tool(
    "health",
    "Check whether the code-search-api service is reachable and report index readiness counters. Read-only.",
    {},
    async () => {
      try {
        return ok(await client.health());
      } catch (error) {
        return fail(error);
      }
    },
  );
}
