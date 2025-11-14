const DEFAULT_QUERY_LIMIT = 3;
const DEFAULT_QUERY_MAX_LIMIT = 100;

export interface MCPServerConfig {
  queryDefaultLimit: number;
  queryMaxLimit: number;
}

function parseLimitValue(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function loadMCPServerConfig(): MCPServerConfig {
  const maxLimit = Math.max(1, parseLimitValue(process.env.MCP_QUERY_MAX_LIMIT, DEFAULT_QUERY_MAX_LIMIT));
  const defaultLimit = parseLimitValue(process.env.MCP_QUERY_DEFAULT_LIMIT, DEFAULT_QUERY_LIMIT);

  return {
    queryMaxLimit: maxLimit,
    queryDefaultLimit: Math.min(Math.max(defaultLimit, 1), maxLimit),
  };
}

export const MCP_SERVER_DEFAULTS = {
  queryLimit: DEFAULT_QUERY_LIMIT,
  queryMaxLimit: DEFAULT_QUERY_MAX_LIMIT,
};

