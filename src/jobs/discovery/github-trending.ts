import * as cheerio from "cheerio";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Candidate, Discovery, TrendingOptions } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  html: string;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

function buildTrendingURL(options: TrendingOptions): string {
  let url = "https://github.com/trending";
  if (options.language) {
    url += `/${encodeURIComponent(options.language)}`;
  }
  const params = new URLSearchParams({ since: options.since });
  if (options.spoken_language_code) {
    params.set("spoken_language_code", options.spoken_language_code);
  }
  return `${url}?${params.toString()}`;
}

async function fetchTrendingHTML(
  ctx: JobContext,
  options: TrendingOptions,
): Promise<string> {
  const url = buildTrendingURL(options);
  const entry = cache.get(url);
  if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
    ctx.log(`[Discovery] 命中缓存: ${url}`);
    return entry.html;
  }

  ctx.log(`[Discovery] 请求: ${url}`);
  const response = await fetch(url, {
    headers: { "User-Agent": "Github-Trending-API", Accept: "text/html" },
    signal: ctx.signal,
  });

  if (!response.ok) {
    throw new Error(
      `GitHub Trending 请求失败: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  cache.set(url, { html, cachedAt: Date.now() });
  ctx.log(`[Discovery] 获取成功，HTML 长度: ${html.length}`);
  return html;
}

function parseTrendingHTML(html: string): Candidate[] {
  const $ = cheerio.load(html);
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  $("article.Box-row").each((index, article) => {
    const heading = $(article).find("h2.h3, h1.h3").first();
    const link = heading.find("a").first();
    const href = link.attr("href");
    if (!href) return;

    const parts = href.replace(/^\/+/, "").split("/");
    if (parts.length < 2) return;

    const owner = parts[0];
    const repo = parts[1];
    const key = `${owner}/${repo}`;
    if (seen.has(key)) return;
    seen.add(key);

    candidates.push({ rank: index + 1, owner, repo });
  });

  return candidates;
}

export function clearCache(): void {
  cache.clear();
}

export const githubTrending: Discovery = {
  name: "github-trending",

  async discover(
    ctx: JobContext,
    options: TrendingOptions,
  ): Promise<Candidate[]> {
    const html = await fetchTrendingHTML(ctx, options);
    const candidates = parseTrendingHTML(html);
    ctx.log(`[Discovery] ${options.since} 解析到 ${candidates.length} 个仓库`);
    return candidates;
  },
};
