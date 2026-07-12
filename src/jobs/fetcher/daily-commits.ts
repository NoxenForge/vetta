import { githubFetch } from "@/utils/github-api";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Fetcher, DailyCommitActivity } from "./types";

/**
 * 获取仓库过去 52 周的每日 commit 数据。
 * GitHub API: GET /repos/{owner}/{repo}/stats/commit_activity
 *
 * 返回格式：每周包含 7 天的提交数（days[0]=周日, days[6]=周六）
 * 首次请求可能返回 202（后台计算中）。
 */
export const dailyCommitsFetcher: Fetcher<DailyCommitActivity> = {
  name: "daily-commits",

  async fetch(
    owner: string,
    repo: string,
    ctx: JobContext,
  ): Promise<DailyCommitActivity> {
    try {
      const response = await githubFetch(
        `/repos/${owner}/${repo}/stats/commit_activity`,
        { signal: ctx.signal },
      );

      if (response.status === 202) {
        ctx.log(
          `[daily-commits] ${owner}/${repo}: 202 Accepted（后台计算中）`,
        );
        return { repo_id: 0, weeks: [], fetched_at: new Date().toISOString() };
      }

      const data = (await response.json()) as Array<{
        days: number[];
        total: number;
        week: number;
      }>;

      return {
        repo_id: 0,
        weeks: Array.isArray(data) ? data : [],
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      ctx.log(
        `[daily-commits] ${owner}/${repo}: 请求失败 — ${error instanceof Error ? error.message : String(error)}`,
      );
      return { repo_id: 0, weeks: [], fetched_at: new Date().toISOString() };
    }
  },
};
