export interface CodeSearchConfig {
  url: string;
  apiKey?: string;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): CodeSearchConfig {
  const url = (env.CODE_SEARCH_API_URL || "http://localhost:5204").replace(/\/+$/, "");
  const apiKey = env.CODE_SEARCH_API_KEY?.trim();

  return {
    url,
    apiKey: apiKey || undefined,
  };
}
