import type { Job, JobContext } from "@/jobs/scheduler/types";
import { githubTrending } from "@/jobs/discovery/github-trending";
import type { TrendingOptions } from "@/jobs/discovery/types";
import { repositoryFetcher } from "@/jobs/fetcher/repository";
import { readmeFetcher } from "@/jobs/fetcher/readme";
import type {
  Repository,
  TrendingSnapshot,
  Readme,
} from "@/jobs/fetcher/types";
import {
  repoStorage,
  snapStorage,
  readmeStorage,
} from "@/jobs/storage/supabase";

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

    // 跨 since 去重：full_name → repo.id 映射
    const repoIdByFullName = new Map<string, number>();

    const allRepos: Repository[] = [];
    const allSnapshots: TrendingSnapshot[] = [];
    const allReadmes: Readme[] = [];
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

            // 记录 id 映射（跨 since 复用）
            repoIdByFullName.set(repo.full_name, repo.id);

            totalSuccess++;
            ctx.log(
              `[TrendingJob] ${since} #${index + 1} ${candidate.owner}/${candidate.repo} ✅`,
            );

            // 生成快照（在 Job 层组合，不依赖 FetchResult）
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

      // ── Fetcher: README（跨 since 去重：已有 repo_id 的跳过）──
      const snatchedIds = new Set(allReadmes.map((r) => r.repo_id));

      const newCandidates = candidates.filter(
        (c) =>
          !snatchedIds.has(
            repoIdByFullName.get(`${c.owner}/${c.repo}`) ?? 0,
          ),
      );

      if (newCandidates.length > 0) {
        const readmes = await mapWithConcurrency(
          newCandidates,
          async (candidate) => {
            try {
              const readme = await readmeFetcher.fetch(
                candidate.owner,
                candidate.repo,
                ctx,
              );
              const repoId =
                repoIdByFullName.get(`${candidate.owner}/${candidate.repo}`) ?? 0;
              return { ...readme, repo_id: repoId };
            } catch {
              ctx.log(
                `[TrendingJob] README 跳过 ${candidate.owner}/${candidate.repo}`,
              );
              return null;
            }
          },
          MAX_CONCURRENCY,
        );

        allReadmes.push(
          ...readmes.filter((r): r is Readme => r !== null),
        );
      }
    }

    ctx.log(
      `[TrendingJob] 全部抓取完成: 成功 ${totalSuccess}，失败 ${totalFail}`,
    );

    // ── Storage: 写入 Supabase ──
    if (allRepos.length > 0) {
      // 去重：同一 id 跨 since 出现多次，只保留最后抓取的那条
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

    if (allReadmes.length > 0) {
      await readmeStorage.saveBatch(allReadmes);
      ctx.log(`[TrendingJob] 已存储 ${allReadmes.length} 条 README`);
    }

    ctx.log("[TrendingJob] 任务完成!");
  },
};
