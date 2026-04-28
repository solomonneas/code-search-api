const DEFAULT_URL = "http://localhost:5204";

function resolveConfig(pluginConfig = {}) {
  const url = String(pluginConfig.url || process.env.CODE_SEARCH_API_URL || DEFAULT_URL).replace(/\/+$/, "");
  const apiKeyEnv = String(pluginConfig.apiKeyEnv || "CODE_SEARCH_API_KEY");
  const apiKey = String(pluginConfig.apiKey || process.env[apiKeyEnv] || process.env.CODE_SEARCH_API_KEY || "").trim();
  return { url, apiKey: apiKey || undefined };
}

function textResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

async function request(config, path, options = {}) {
  const headers = { Accept: "application/json" };
  if (config.apiKey) headers["X-API-Key"] = config.apiKey;
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(`${config.url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    const detail = text ? `: ${text.slice(0, 500)}` : "";
    if (response.status === 401 || response.status === 403) {
      throw new Error(`code-search-api rejected the request. Check CODE_SEARCH_API_KEY${detail}`);
    }
    throw new Error(`code-search-api HTTP ${response.status} for ${path}${detail}`);
  }
  return text ? JSON.parse(text) : undefined;
}

function makeTool(config, tool) {
  return {
    ...tool,
    execute: async (_toolCallId, params = {}) => {
      const payload = await tool.run(params, config);
      return textResult(payload);
    },
  };
}

const searchParameters = {
  type: "object",
  additionalProperties: false,
  required: ["query"],
  properties: {
    query: {
      type: "string",
      minLength: 1,
      description: "Natural-language description of the code, behavior, symbol, or workflow to find.",
    },
    mode: {
      type: "string",
      enum: ["hybrid", "code", "summary"],
      default: "hybrid",
      description: "Search mode.",
    },
    project: {
      type: "string",
      minLength: 1,
      description: "Optional exact project filter from list_projects.",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      default: 10,
      description: "Maximum results to return.",
    },
    min_score: {
      type: "number",
      minimum: 0,
      maximum: 1,
      default: 0.3,
      description: "Minimum similarity score.",
    },
  },
};

const emptyParameters = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

const tools = [
  {
    name: "search_code",
    label: "Search Code",
    description: "Search the indexed local codebase by developer intent using hybrid semantic search. Read-only.",
    parameters: searchParameters,
    run: async (params, config) => {
      return await request(config, "/api/search", {
        method: "POST",
        body: JSON.stringify({
          query: String(params.query),
          mode: params.mode || "hybrid",
          project: params.project,
          limit: params.limit || 10,
          min_score: params.min_score ?? 0.3,
        }),
      });
    },
  },
  {
    name: "list_projects",
    label: "List Projects",
    description: "List projects currently present in the code-search-api index. Read-only.",
    parameters: emptyParameters,
    run: async (_params, config) => await request(config, "/api/projects"),
  },
  {
    name: "code_search_stats",
    label: "Code Search Stats",
    description: "Return code-search-api index health statistics. Read-only.",
    parameters: emptyParameters,
    run: async (_params, config) => {
      const [stats, summaryStats] = await Promise.all([
        request(config, "/api/stats"),
        request(config, "/api/summary-stats"),
      ]);
      return { stats, summary_stats: summaryStats };
    },
  },
  {
    name: "health",
    label: "Health",
    description: "Check whether the code-search-api service is reachable. Read-only.",
    parameters: emptyParameters,
    run: async (_params, config) => await request(config, "/health"),
  },
];

export default {
  id: "code-search",
  name: "Code Search",
  description: "Read-only tools for querying a local code-search-api semantic index by intent.",
  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      url: { type: "string", format: "uri", default: DEFAULT_URL },
      apiKey: { type: "string" },
      apiKeyEnv: { type: "string", default: "CODE_SEARCH_API_KEY" },
    },
  },
  register(api) {
    if (api.registrationMode !== "full") return;
    const config = resolveConfig(api.pluginConfig);
    for (const tool of tools) {
      api.registerTool(makeTool(config, tool));
    }
  },
};
