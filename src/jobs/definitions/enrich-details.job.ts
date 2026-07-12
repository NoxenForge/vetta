import { createClient } from "@supabase/supabase-js";
import type { Job, JobContext } from "@/jobs/scheduler/types";
import { repositoryFetcher } from "@/jobs/fetcher/repository";
import { readmeFetcher } from "@/jobs/fetcher/readme";
import { dailyCommitsFetcher } from "@/jobs/fetcher/daily-commits";
import { releaseSummaryFetcher } from "@/jobs/fetcher/release-summary";
import { contributorCountFetcher } from "@/jobs/fetcher/contributor-count";
import type {
  Repository,
  Readme,
  DailyCommitActivity,
} from "@/jobs/fetcher/types";
import { toMetricsRow } from "@/jobs/fetcher/types";
import type { MetricsHistoryRecord } from "@/jobs/fetcher/types";
import {
  repoStorage,
  metricsStorage,
  historyStorage,
  readmeStorage,
  toRepoRow,
} from "@/jobs/storage/supabase";
import { mapWithConcurrency } from "@/jobs/utils/concurrency";

const MAX_CONCURRENCY = 5;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "enrich-details 需要 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key);
}

interface RepoRow {
  id: number;
  owner: string;
  repo: string;
}

/** 计算 SHA-256 哈希（用于 README 去重/增量更新） */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const enrichDetailsJob: Job = {
  name: "enrich-details",

  async run(ctx: JobContext): Promise<void> {
    ctx.log("[EnrichDetails] 开始全量刷新仓库详情...");

    const supabase = getSupabase();

    // 1. 查询所有仓库
    const { data: repos, error: queryError } = await supabase
      .from("repositories")
      .select("id, owner, repo");

    if (queryError) {
      ctx.log(`[EnrichDetails] 查询仓库失败: ${queryError.message}`);
      return;
    }

    const allRepos = (repos ?? []) as RepoRow[];

    if (allRepos.length === 0) {
      ctx.log("[EnrichDetails] 没有仓库记录，跳过");
      return;
    }

    ctx.log(`[EnrichDetails] 共 ${allRepos.length} 个仓库待刷新`);

    // 2. 并发刷新每个仓库
    let successMeta = 0;
    let successReadme = 0;
    let successDailyCommits = 0;
    let successRelease = 0;
    let successContrib = 0;

    const allReposResult: Repository[] = [];
    const allReadmeResults: Readme[] = [];
    const allDailyCommits: Map<number, DailyCommitActivity["weeks"]> = new Map();

    const results = await mapWithConcurrency(
      allRepos,
      async (repo, index) => {
        ctx.log(
          `[EnrichDetails] #${index + 1}/${allRepos.length} ${repo.owner}/${repo.repo}`,
        );

        // 并行抓取：元数据 + README + DailyCommit(日) + Release + 贡献者
        const [metaResult, readmeResult, dailyCommitResult, releaseResult, contribResult] =
          await Promise.allSettled([
            repositoryFetcher.fetch(repo.owner, repo.repo, ctx),
            readmeFetcher.fetch(repo.owner, repo.repo, ctx),
            dailyCommitsFetcher.fetch(repo.owner, repo.repo, ctx),
            releaseSummaryFetcher.fetch(repo.owner, repo.repo, ctx),
            contributorCountFetcher.fetch(repo.owner, repo.repo, ctx),
          ]);

        if (metaResult.status === "fulfilled") successMeta++;
        else ctx.log(
          `[EnrichDetails] 元数据失败 ${repo.owner}/${repo.repo}: ${metaResult.reason instanceof Error ? metaResult.reason.message : String(metaResult.reason)}`,
        );

        if (readmeResult.status === "fulfilled") successReadme++;
        else ctx.log(
          `[EnrichDetails] README 失败 ${repo.owner}/${repo.repo}: ${readmeResult.reason instanceof Error ? readmeResult.reason.message : String(readmeResult.reason)}`,
        );

        if (dailyCommitResult.status === "fulfilled") successDailyCommits++;
        else ctx.log(
          `[EnrichDetails] DailyCommit 失败 ${repo.owner}/${repo.repo}: ${dailyCommitResult.reason instanceof Error ? dailyCommitResult.reason.message : String(dailyCommitResult.reason)}`,
        );

        if (releaseResult.status === "fulfilled") successRelease++;
        else ctx.log(
          `[EnrichDetails] Release 失败 ${repo.owner}/${repo.repo}: ${releaseResult.reason instanceof Error ? releaseResult.reason.message : String(releaseResult.reason)}`,
        );

        if (contribResult.status === "fulfilled") successContrib++;
        else ctx.log(
          `[EnrichDetails] 贡献者 失败 ${repo.owner}/${repo.repo}: ${contribResult.reason instanceof Error ? contribResult.reason.message : String(contribResult.reason)}`,
        );

        return {
          meta: metaResult.status === "fulfilled" ? metaResult.value : null,
          readme:
            readmeResult.status === "fulfilled"
              ? { ...readmeResult.value, repo_id: repo.id }
              : null,
          dailyCommit:
            dailyCommitResult.status === "fulfilled"
              ? { ...dailyCommitResult.value, repo_id: repo.id }
              : null,
          release:
            releaseResult.status === "fulfilled"
              ? { ...releaseResult.value, repo_id: repo.id }
              : null,
          contrib:
            contribResult.status === "fulfilled"
              ? { ...contribResult.value, repo_id: repo.id }
              : null,
        };
      },
      MAX_CONCURRENCY,
    );

    // 收集各 fetcher 的结果
    const releaseByRepoId = new Map<
      number,
      { release_count: number; latest_release_at: string | null }
    >();
    const contributorByRepoId = new Map<number, number>();

    for (const r of results) {
      if (r.meta) {
        allReposResult.push(r.meta);
        if (r.dailyCommit?.weeks && r.dailyCommit.weeks.length > 0) {
          allDailyCommits.set(r.meta.id, r.dailyCommit.weeks);
        }
        if (r.release) {
          releaseByRepoId.set(r.meta.id, {
            release_count: r.release.release_count,
            latest_release_at: r.release.latest_release_at,
          });
        }
        if (r.contrib) {
          contributorByRepoId.set(r.meta.id, r.contrib.contributor_count);
        }
      }
      if (r.readme) {
        allReadmeResults.push(r.readme);
      }
    }

    // 并行计算 README SHA-256 哈希
    if (allReadmeResults.length > 0) {
      const hashedReadmes = await Promise.all(
        allReadmeResults.map(async (rm) => {
          const hash = await hashContent(rm.content);
          return { ...rm, content_hash: hash, etag: null };
        }),
      );
      allReadmeResults.length = 0;
      allReadmeResults.push(...hashedReadmes);
    }

    ctx.log(
      `[EnrichDetails] 抓取完成: 元数据 ${successMeta}/${allRepos.length}, README ${successReadme}/${allRepos.length}, DailyCommit ${successDailyCommits}/${allRepos.length}, Release ${successRelease}/${allRepos.length}, 贡献者 ${successContrib}/${allRepos.length}`,
    );

    // 3. 存储
    if (allReposResult.length > 0) {
      // repositories（静态字段）
      await repoStorage.saveBatch(allReposResult.map(toRepoRow));
      ctx.log(`[EnrichDetails] 已刷新 ${allReposResult.length} 条仓库元数据`);

      // repository_metrics（当前指标，upsert by repo_id）
      const metricsRows = allReposResult.map((r) => {
        const rel = releaseByRepoId.get(r.id);
        const contrib = contributorByRepoId.get(r.id);
        const dailyWeeks = allDailyCommits.get(r.id);
        return toMetricsRow(r, {
          contributor_count: contrib ?? null,
          release_count: rel?.release_count ?? 0,
          latest_release_at: rel?.latest_release_at ?? null,
          commit_activity: dailyWeeks ?? null,
        });
      });
      await metricsStorage.saveBatch(metricsRows);
      ctx.log(`[EnrichDetails] 已刷新 ${metricsRows.length} 条当前指标`);

      // repository_metrics_history（每日快照，append-only）
      const now = new Date().toISOString();
      const historyRecords: MetricsHistoryRecord[] = allReposResult.map((r) => {
        const rel = releaseByRepoId.get(r.id);
        const contrib = contributorByRepoId.get(r.id);
        return {
          repo_id: r.id,
          stargazers_count: r.stargazers_count,
          forks_count: r.forks_count,
          open_issues_count: r.open_issues_count,
          contributor_count: contrib ?? null,
          release_count: rel?.release_count ?? 0,
          pushed_at: r.pushed_at,
          snapshot_at: now,
        };
      });
      await historyStorage.saveBatch(historyRecords);
      ctx.log(
        `[EnrichDetails] 已写入 ${historyRecords.length} 条历史快照`,
      );
    }

    if (allReadmeResults.length > 0) {
      await readmeStorage.saveBatch(allReadmeResults);
      ctx.log(`[EnrichDetails] 已刷新 ${allReadmeResults.length} 条 README`);
    }

    ctx.log("[EnrichDetails] 全量刷新完成!");
  },
};
