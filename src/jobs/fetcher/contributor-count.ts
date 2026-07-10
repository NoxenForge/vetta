import { githubFetch } from "@/utils/github-api";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Fetcher, ContributorCount } from "./types";

/**
 * 获取仓库贡献者总数。
 * GitHub API: GET /repos/{owner}/{repo}/contributors?per_page=1&anon=true
 *
 * 通过响应头 Link 的 rel="last" 提取总页数作为贡献者数量
 * （每页 1 条 → 最后一页页码 = 总数）。
 */
export const contributorCountFetcher: Fetcher<ContributorCount> = {
  name: "contributor-count",

  async fetch(
    owner: string,
    repo: string,
    ctx: JobContext,
  ): Promise<ContributorCount> {
    try {
      const response = await githubFetch(
        `/repos/${owner}/${repo}/contributors?per_page=1&anon=true`,
        { signal: ctx.signal },
      );

      // 从 Link 头解析最后一页页码
      const linkHeader = response.headers.get("Link");
      let totalCount = 0;

      if (linkHeader) {
        const lastMatch = linkHeader.match(
          /[?&]page=(\d+)[^>]*>;\s*rel="last"/,
        );
        if (lastMatch) {
          totalCount = parseInt(lastMatch[1], 10);
        }
      }

      // 如果没拿到 Link 头（只有 1 页或更少），直接看响应数组长度
      if (totalCount === 0) {
        const contributors = (await response.json()) as unknown[];
        totalCount = contributors.length;
      }

      return {
        repo_id: 0,
        contributor_count: totalCount,
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      ctx.log(
        `[contributor] ${owner}/${repo}: 请求失败 — ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        repo_id: 0,
        contributor_count: 0,
        fetched_at: new Date().toISOString(),
      };
    }
  },
};
