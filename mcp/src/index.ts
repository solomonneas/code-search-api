import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CodeSearchClient } from "./client.js";
import { getConfig } from "./config.js";
import { registerCodeSearchTools } from "./tools/code-search.js";

const VERSION = "0.1.0";

export function createServer(): McpServer {
  const config = getConfig();
  const client = new CodeSearchClient(config);
  const server = new McpServer({
    name: "code-search-mcp",
    version: VERSION,
    description:
      "Read-only MCP server for querying a local code-search-api semantic index by intent.",
  });

  registerCodeSearchTools(server, client);
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`code-search-mcp fatal: ${msg}`);
  process.exit(1);
});
