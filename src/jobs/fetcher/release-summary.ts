import { githubFetch } from "@/utils/github-api";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Fetcher, ReleaseSummary } from "./types";

interface GitHubRelease {
  published_at?: string;
}

/**
 * 获取仓库 Release 摘要（最近 5 个版本）。
 * GitHub API: GET /repos/{owner}/{repo}/releases?per_page=5
 */
export const releaseSummaryFetcher: Fetcher<ReleaseSummary> = {
  name: "release-summary",

  async fetch(
    owner: string,
    repo: string,
    ctx: JobContext,
  ): Promise<ReleaseSummary> {
    try {
      const response = await githubFetch(
        `/repos/${owner}/${repo}/releases?per_page=5`,
        { signal: ctx.signal },
      );

      const releases = (await response.json()) as GitHubRelease[];

      const latest =
        releases.length > 0 ? releases[0].published_at ?? null : null;

      return {
        repo_id: 0,
        release_count: releases.length,
        latest_release_at: latest,
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      ctx.log(
        `[release] ${owner}/${repo}: 请求失败 — ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        repo_id: 0,
        release_count: 0,
        latest_release_at: null,
        fetched_at: new Date().toISOString(),
      };
    }
  },
};
