/**
 * GitHub API 共享客户端 —— 统一 auth、User-Agent、重试、错误处理。
 *
 * 所有 Fetcher 通过此模块发请求，避免重复代码。
 */

const GITHUB_API_BASE = "https://api.github.com";

/** 429 重试配置 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function buildHeaders(accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "Github-Trending-API",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** 请求 GitHub API，自动处理 429 重试 */
export async function githubFetch(
  path: string,
  options?: {
    accept?: string;
    signal?: AbortSignal;
  },
): Promise<Response> {
  const url = `${GITHUB_API_BASE}${path}`;
  const accept = options?.accept ?? "application/vnd.github.v3+json";

  const lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: buildHeaders(accept),
      signal: options?.signal,
    });

    // 429: 等一会重试
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : RETRY_DELAY_MS * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API 请求失败 (${path}): ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }

  throw lastError ?? new Error(`GitHub API 请求失败 (${path}): 429 重试耗尽`);
}
