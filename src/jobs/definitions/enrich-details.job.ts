import { createClient } from "@supabase/supabase-js";
import type { Job, JobContext } from "@/jobs/scheduler/types";
import { repositoryFetcher } from "@/jobs/fetcher/repository";
import { readmeFetcher } from "@/jobs/fetcher/readme";
import type { Repository, Readme } from "@/jobs/fetcher/types";
import { repoStorage, readmeStorage } from "@/jobs/storage/supabase";

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

    // 2. 并发刷新每个仓库（元数据 + README 并行）
    let successMeta = 0;
    let failMeta = 0;
    let successReadme = 0;
    let failReadme = 0;
    const allMetaResults: Repository[] = [];
    const allReadmeResults: Readme[] = [];

    const results = await mapWithConcurrency(
      allRepos,
      async (repo, index) => {
        ctx.log(
          `[EnrichDetails] #${index + 1}/${allRepos.length} ${repo.owner}/${repo.repo}`,
        );

        // 并行抓取元数据和 README
        const [metaResult, readmeResult] = await Promise.allSettled([
          repositoryFetcher.fetch(repo.owner, repo.repo, ctx),
          readmeFetcher.fetch(repo.owner, repo.repo, ctx),
        ]);

        if (metaResult.status === "fulfilled") {
          successMeta++;
        } else {
          failMeta++;
          ctx.log(
            `[EnrichDetails] 元数据失败 ${repo.owner}/${repo.repo}: ${metaResult.reason instanceof Error ? metaResult.reason.message : String(metaResult.reason)}`,
          );
        }

        if (readmeResult.status === "fulfilled") {
          successReadme++;
        } else {
          failReadme++;
          ctx.log(
            `[EnrichDetails] README 失败 ${repo.owner}/${repo.repo}: ${readmeResult.reason instanceof Error ? readmeResult.reason.message : String(readmeResult.reason)}`,
          );
        }

        return {
          index,
          meta: metaResult.status === "fulfilled" ? metaResult.value : null,
          readme:
            readmeResult.status === "fulfilled"
              ? { ...readmeResult.value, repo_id: repo.id }
              : null,
        };
      },
      MAX_CONCURRENCY,
    );

    for (const r of results) {
      if (r.meta) allMetaResults.push(r.meta);
      if (r.readme) allReadmeResults.push(r.readme);
    }

    ctx.log(
      `[EnrichDetails] 抓取完成: 元数据 ${successMeta}/${allRepos.length} 成功, README ${successReadme}/${allRepos.length} 成功`,
    );

    // 3. 存储
    if (allMetaResults.length > 0) {
      await repoStorage.saveBatch(allMetaResults);
      ctx.log(`[EnrichDetails] 已刷新 ${allMetaResults.length} 条仓库元数据`);
    }

    if (allReadmeResults.length > 0) {
      await readmeStorage.saveBatch(allReadmeResults);
      ctx.log(`[EnrichDetails] 已刷新 ${allReadmeResults.length} 条 README`);
    }

    ctx.log("[EnrichDetails] 全量刷新完成!");
  },
};
