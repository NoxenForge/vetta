import type { Job, JobContext } from "@/jobs/scheduler/types";
import { githubTrending } from "@/jobs/discovery/github-trending";
import type { TrendingOptions } from "@/jobs/discovery/types";
import { repositoryFetcher } from "@/jobs/fetcher/repository";
import type {
  Repository,
  MetricsHistoryRecord,
} from "@/jobs/fetcher/types";
import {
  repoStorage,
  historyStorage,
  toRepoRow,
  upsertBasicMetrics,
} from "@/jobs/storage/supabase";
import { mapWithConcurrency } from "@/jobs/utils/concurrency";
import { startJobLog, finishJobLog } from "@/jobs/utils/job-logger";

const SINCE_OPTIONS: TrendingOptions["since"][] = [
  "daily",
  "weekly",
  "monthly",
];

const MAX_CONCURRENCY = 5;

export const trendingJob: Job = {
  name: "trending",

  async run(ctx: JobContext): Promise<void> {
    const { logId, startedAt } = await startJobLog({
      job_type: "full",
      trigger_type: "cron",
      metadata: { since_options: SINCE_OPTIONS },
    });

    let status: "success" | "failed" = "success";
    let errorMsg: string | undefined;

    const allRepos: Repository[] = [];
    const allHistory: MetricsHistoryRecord[] = [];
    let totalSuccess = 0;
    let totalFail = 0;

    try {
      ctx.log("[TrendingJob] 开始执行...");

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

            // 生成历史快照（append-only）
            const historyRecord: MetricsHistoryRecord = {
              repo_id: repo.id,
              stargazers_count: repo.stargazers_count,
              forks_count: repo.forks_count,
              open_issues_count: repo.open_issues_count,
              contributor_count: null,
              release_count: 0,
              pushed_at: repo.pushed_at,
              snapshot_at: repo.fetched_at,
            };

            return { repo, historyRecord };
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
          allHistory.push(r.historyRecord);
        }
      }
    }

    ctx.log(
      `[TrendingJob] 全部抓取完成: 成功 ${totalSuccess}，失败 ${totalFail}`,
    );

    // ── Storage ──
    if (allRepos.length > 0) {
      // 去重后写入 repositories（静态字段）
      const uniqueRepos = Array.from(
        new Map(allRepos.map((r) => [r.id, r])).values(),
      );

      await repoStorage.saveBatch(uniqueRepos.map(toRepoRow));
      ctx.log(
        `[TrendingJob] 已存储 ${uniqueRepos.length} 条仓库元数据`,
      );

      // 写入 repository_metrics（仅基础字段，不覆盖 enrich 专属数据）
      await upsertBasicMetrics(
        uniqueRepos.map((r) => ({
          repo_id: r.id,
          stargazers_count: r.stargazers_count,
          forks_count: r.forks_count,
          open_issues_count: r.open_issues_count,
          pushed_at: r.pushed_at,
        })),
      );
      ctx.log(
        `[TrendingJob] 已存储 ${uniqueRepos.length} 条基础指标`,
      );
    }

    if (allHistory.length > 0) {
      await historyStorage.saveBatch(allHistory);
      ctx.log(`[TrendingJob] 已存储 ${allHistory.length} 条历史快照`);
    }

    ctx.log("[TrendingJob] 任务完成!");
    } catch (error) {
      status = "failed";
      errorMsg = error instanceof Error ? error.message : String(error);
      ctx.log(`[TrendingJob] 任务异常: ${errorMsg}`);
    } finally {
      await finishJobLog(logId, {
        startedAt,
        status,
        error_message: errorMsg,
        metadata: { repos_saved: allRepos.length, history_saved: allHistory?.length ?? 0 },
      });
    }
  },
};
