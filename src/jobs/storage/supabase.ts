import { createClient } from "@supabase/supabase-js";
import type { Storage } from "./types";
import type {
  Repository,
  RepoRow,
  MetricsRow,
  MetricsHistoryRecord,
  Readme,
} from "@/jobs/fetcher/types";

/**
 * 创建 Supabase 客户端（server-side，使用 service_role key 写入）。
 * 注意：需要 SUPABASE_SERVICE_ROLE_KEY 环境变量。
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase 存储需要 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key);
}

// ── 表名常量 ─────────────────────────────────────────────

const REPOS_TABLE = "repositories";
const METRICS_TABLE = "repository_metrics";
const HISTORY_TABLE = "repository_metrics_history";
const READMES_TABLE = "repository_readmes";

// ── Repository 存储（静态字段）─────────────────────────────

/** 将完整的 Repository 对象转换为 repositories 表可写入的 RepoRow */
export function toRepoRow(repo: Repository): RepoRow {
  return {
    id: repo.id,
    full_name: repo.full_name,
    owner: repo.owner,
    repo: repo.repo,
    html_url: repo.html_url,
    avatar_url: repo.avatar_url,
    description: repo.description,
    language: repo.language,
    topics: repo.topics,
    license: repo.license,
    homepage: repo.homepage,
    default_branch: repo.default_branch,
    visibility: repo.visibility,
    archived: repo.archived,
    fork: repo.fork,
    is_template: repo.is_template,
    github_created_at: repo.github_created_at,
    github_updated_at: repo.github_updated_at,
  };
}

export const repoStorage: Storage<RepoRow> = {
  name: "supabase-repositories",

  async save(data: RepoRow): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(REPOS_TABLE)
      .upsert(data, { onConflict: "id" });

    if (error) throw new Error(`Repository 写入失败: ${error.message}`);
  },

  async saveBatch(data: RepoRow[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from(REPOS_TABLE)
      .upsert(data, { onConflict: "id" });

    if (error) throw new Error(`Repository 批量写入失败: ${error.message}`);
  },
};

// ── Metrics 存储（当前动态指标）─────────────────────────────

export const metricsStorage: Storage<MetricsRow> = {
  name: "supabase-metrics",

  async save(data: MetricsRow): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(METRICS_TABLE)
      .upsert(data, { onConflict: "repo_id" });

    if (error) throw new Error(`Metrics 写入失败: ${error.message}`);
  },

  async saveBatch(data: MetricsRow[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from(METRICS_TABLE)
      .upsert(data, { onConflict: "repo_id" });

    if (error) throw new Error(`Metrics 批量写入失败: ${error.message}`);
  },
};

// ── Metrics History 存储（append-only 历史快照）────────────

export const historyStorage: Storage<MetricsHistoryRecord> = {
  name: "supabase-history",

  async save(data: MetricsHistoryRecord): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from(HISTORY_TABLE).insert(data);

    if (error) throw new Error(`History 写入失败: ${error.message}`);
  },

  async saveBatch(data: MetricsHistoryRecord[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase.from(HISTORY_TABLE).insert(data);

    if (error) throw new Error(`History 批量写入失败: ${error.message}`);
  },
};

// ── 基础指标写入（仅 Trending Job 已知字段，不覆盖 enrich 数据）──

/** 仅更新 Trending Job 有能力抓取的基础指标字段，不覆盖 enrich 专属字段 */
export async function upsertBasicMetrics(
  rows: Array<{
    repo_id: number;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase
    .from(METRICS_TABLE)
    .upsert(rows, { onConflict: "repo_id" });
  if (error) throw new Error(`基础指标写入失败: ${error.message}`);
}

// ── Readme 存储 ────────────────────────────────────────────

export const readmeStorage: Storage<Readme> = {
  name: "supabase-readmes",

  async save(data: Readme): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(READMES_TABLE)
      .upsert(data, { onConflict: "repo_id" });

    if (error) throw new Error(`README 写入失败: ${error.message}`);
  },

  async saveBatch(data: Readme[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from(READMES_TABLE)
      .upsert(data, { onConflict: "repo_id" });

    if (error) throw new Error(`README 批量写入失败: ${error.message}`);
  },
};
