import { createClient } from "@supabase/supabase-js";
import type { Job, JobContext } from "@/jobs/scheduler/types";
import { repositoryFetcher } from "@/jobs/fetcher/repository";
import { readmeFetcher } from "@/jobs/fetcher/readme";
import { commitParticipationFetcher } from "@/jobs/fetcher/commit-participation";
import { releaseSummaryFetcher } from "@/jobs/fetcher/release-summary";
import { contributorCountFetcher } from "@/jobs/fetcher/contributor-count";
import type {
  Repository,
  Readme,
  TrendingSnapshot,
} from "@/jobs/fetcher/types";
import { repoStorage, readmeStorage, snapStorage } from "@/jobs/storage/supabase";

const MAX_CONCURRENCY = 5;
const REPOS_TABLE = "repositories";

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

    // 2. 并发刷新每个仓库（元数据 + README + 工程指标 并行）
    let successMeta = 0;
    let successReadme = 0;
    let successCommit = 0;
    let successRelease = 0;
    let successContrib = 0;
    const allMetaResults: Repository[] = [];
    const allReadmeResults: Readme[] = [];
    const metricsRows: {
      id: number;
      commit_activity?: number[];
      contributor_count?: number;
      release_count?: number;
      latest_release_at?: string | null;
    }[] = [];

    const results = await mapWithConcurrency(
      allRepos,
      async (repo, index) => {
        ctx.log(
          `[EnrichDetails] #${index + 1}/${allRepos.length} ${repo.owner}/${repo.repo}`,
        );

        // 并行抓取：元数据 + README + Commit 活跃度 + Release + 贡献者
        const [metaResult, readmeResult, commitResult, releaseResult, contribResult] =
          await Promise.allSettled([
            repositoryFetcher.fetch(repo.owner, repo.repo, ctx),
            readmeFetcher.fetch(repo.owner, repo.repo, ctx),
            commitParticipationFetcher.fetch(repo.owner, repo.repo, ctx),
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

        if (commitResult.status === "fulfilled") successCommit++;
        else ctx.log(
          `[EnrichDetails] Commit 失败 ${repo.owner}/${repo.repo}: ${commitResult.reason instanceof Error ? commitResult.reason.message : String(commitResult.reason)}`,
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
          index,
          meta: metaResult.status === "fulfilled" ? metaResult.value : null,
          readme:
            readmeResult.status === "fulfilled"
              ? { ...readmeResult.value, repo_id: repo.id }
              : null,
          commit:
            commitResult.status === "fulfilled"
              ? { ...commitResult.value, repo_id: repo.id }
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

    for (const r of results) {
      if (r.meta) {
        allMetaResults.push(r.meta);
        // 收集工程指标数据（等 schema 迁移后再写入）
        if (r.commit || r.release || r.contrib) {
          metricsRows.push({
            id: r.meta.id,
            commit_activity: r.commit?.all ?? undefined,
            contributor_count: r.contrib?.contributor_count ?? undefined,
            release_count: r.release?.release_count ?? undefined,
            latest_release_at: r.release?.latest_release_at ?? undefined,
          });
        }
      }
      if (r.readme) allReadmeResults.push(r.readme);
    }

    ctx.log(
      `[EnrichDetails] 抓取完成: 元数据 ${successMeta}/${allRepos.length}, README ${successReadme}/${allRepos.length}, Commit ${successCommit}/${allRepos.length}, Release ${successRelease}/${allRepos.length}, 贡献者 ${successContrib}/${allRepos.length}`,
    );

    // 3. 存储
    if (allMetaResults.length > 0) {
      const repoRows = allMetaResults.map(
        ({ stargazers_count, forks_count, open_issues_count, fetched_at, ...row }) => row,
      );
      await repoStorage.saveBatch(repoRows);
      ctx.log(`[EnrichDetails] 已刷新 ${repoRows.length} 条仓库元数据`);

      // 为每个仓库写入 daily 快照（趋势图需要多时间点的数据）
      const now = new Date().toISOString();
      const dailySnapshots: TrendingSnapshot[] = allMetaResults.map((r) => ({
        repo_id: r.id,
        since: "daily",
        rank: 0,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        open_issues_count: r.open_issues_count,
        fetched_at: now,
      }));
      await snapStorage.saveBatch(dailySnapshots);
      ctx.log(
        `[EnrichDetails] 已写入 ${dailySnapshots.length} 条 daily 快照`,
      );
    }

    if (metricsRows.length > 0) {
      // 逐行 update 指标列（upsert 会要求所有 NOT NULL 列，update 只改指定列）
      const supabase = getSupabase();
      let metricsWritten = 0;
      const updatePromises = metricsRows.map((row) =>
        supabase
          .from(REPOS_TABLE)
          .update({
            commit_activity: row.commit_activity ?? null,
            contributor_count: row.contributor_count ?? null,
            release_count: row.release_count ?? null,
            latest_release_at: row.latest_release_at ?? null,
          })
          .eq("id", row.id)
          .then(({ error }) => {
            if (error) {
              ctx.log(
                `[EnrichDetails] 指标 update id=${row.id} 失败: ${error.message}`,
              );
            } else {
              metricsWritten++;
            }
          }),
      );
      await Promise.all(updatePromises);
      if (metricsWritten > 0) {
        ctx.log(`[EnrichDetails] 已刷新 ${metricsWritten} 条工程指标`);
      }
    }

    if (allReadmeResults.length > 0) {
      await readmeStorage.saveBatch(allReadmeResults);
      ctx.log(`[EnrichDetails] 已刷新 ${allReadmeResults.length} 条 README`);
    }

    ctx.log("[EnrichDetails] 全量刷新完成!");
  },
};
