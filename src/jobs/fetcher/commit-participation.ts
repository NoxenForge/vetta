import { githubFetch } from "@/utils/github-api";
import type { JobContext } from "@/jobs/scheduler/types";
import type { Fetcher, CommitParticipation } from "./types";

/**
 * 获取仓库过去 52 周的 commit 活跃度数据。
 * GitHub API: GET /repos/{owner}/{repo}/stats/participation
 *
 * 首次请求可能返回 202（后台计算中），此时返回空数组。
 * 后续 enrich-details 运行时会逐步补全。
 */
export const commitParticipationFetcher: Fetcher<CommitParticipation> = {
  name: "commit-participation",

  async fetch(
    owner: string,
    repo: string,
    ctx: JobContext,
  ): Promise<CommitParticipation> {
    try {
      const response = await githubFetch(
        `/repos/${owner}/${repo}/stats/participation`,
        { signal: ctx.signal },
      );

      // 202: GitHub 正在后台计算统计数据，暂不可用
      if (response.status === 202) {
        ctx.log(
          `[commit] ${owner}/${repo}: 202 Accepted（后台计算中），返回空数组`,
        );
        return { repo_id: 0, all: [], fetched_at: new Date().toISOString() };
      }

      const data = (await response.json()) as {
        all?: number[];
        owner?: number[];
      };

      return {
        repo_id: 0, // 由 Job 层补填
        all: Array.isArray(data.all) ? data.all : [],
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      ctx.log(
        `[commit] ${owner}/${repo}: 请求失败 — ${error instanceof Error ? error.message : String(error)}`,
      );
      return { repo_id: 0, all: [], fetched_at: new Date().toISOString() };
    }
  },
};
