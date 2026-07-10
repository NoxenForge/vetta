import type { Job, JobContext } from "@/jobs/scheduler/types";
import { githubTrending } from "@/jobs/discovery/github-trending";
import type { TrendingOptions } from "@/jobs/discovery/types";
import { repositoryFetcher } from "@/jobs/fetcher/repository";
import type { Repository, TrendingSnapshot } from "@/jobs/fetcher/types";
import { repoStorage, snapStorage } from "@/jobs/storage/supabase";

const SINCE_OPTIONS: TrendingOptions["since"][] = [
  "daily",
  "weekly",
  "monthly",
];

const MAX_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

export const trendingJob: Job = {
  name: "trending",

  async run(ctx: JobContext): Promise<void> {
    ctx.log("[TrendingJob] 开始执行...");

    const allRepos: Repository[] = [];
    const allSnapshots: TrendingSnapshot[] = [];
    let totalSuccess = 0;
    let totalFail = 0;

    for (const since of SINCE_OPTIONS) {
      ctx.log(`[TrendingJob] ── 抓取 since=${since} ──`);

      // ── Discovery ──
      const options: TrendingOptions = { since };
      const candidates = await githubTrending.discover(ctx, options);
      ctx.log(`[TrendingJob] ${since}: 发现 ${candidates.length} 个仓库`);

      if (candidates.length === 0) continue;

      // ── Fetcher: 仓库元数据 ──
      const results = await mapWithConcurrency(
        candidates,
        async (candidate, index) => {
          try {
            const repo = await repositoryFetcher.fetch(
              candidate.owner,
              candidate.repo,
              ctx,
            );

            totalSuccess++;
            ctx.log(
              `[TrendingJob] ${since} #${index + 1} ${candidate.owner}/${candidate.repo} ✅`,
            );

            // 生成快照（在 Job 层组合）
            const snapshot: TrendingSnapshot = {
              repo_id: repo.id,
              since,
              rank: candidate.rank,
              stargazers_count: repo.stargazers_count,
              forks_count: repo.forks_count,
              open_issues_count: repo.open_issues_count,
              fetched_at: repo.fetched_at,
            };

            return { repo, snapshot };
          } catch (error) {
            totalFail++;
            ctx.log(
              `[TrendingJob] ${since} #${index + 1} ${candidate.owner}/${candidate.repo} ❌: ${error instanceof Error ? error.message : String(error)}`,
            );
            return null;
          }
        },
        MAX_CONCURRENCY,
      );

      for (const r of results) {
        if (r) {
          allRepos.push(r.repo);
          allSnapshots.push(r.snapshot);
        }
      }
    }

    ctx.log(
      `[TrendingJob] 全部抓取完成: 成功 ${totalSuccess}，失败 ${totalFail}`,
    );

    // ── Storage: 写入 Supabase ──
    if (allRepos.length > 0) {
      const uniqueRepos = Array.from(
        new Map(allRepos.map((r) => [r.id, r])).values(),
      );
      await repoStorage.saveBatch(uniqueRepos);
      ctx.log(
        `[TrendingJob] 已存储 ${uniqueRepos.length} 条仓库元数据`,
      );
    }

    if (allSnapshots.length > 0) {
      await snapStorage.saveBatch(allSnapshots);
      ctx.log(`[TrendingJob] 已存储 ${allSnapshots.length} 条快照`);
    }

    ctx.log("[TrendingJob] 任务完成!");
  },
};
