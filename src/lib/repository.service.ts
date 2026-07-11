import { createClient } from "@supabase/supabase-js";
import type {
  TrendingRepo,
  TrendingFilters,
  RepoDetail,
  TrendSnapshot,
} from "@/types/ui";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("缺少 Supabase 环境变量");
  }
  return createClient(supabaseUrl, supabaseKey);
}

/** 快照行原始数据（Supabase join 返回格式 — repositories 不含变动数据列） */
interface SnapshotRow {
  since: string;
  rank: number;
  stargazers_count: number;
  forks_count: number;
  fetched_at: string;
  repositories: {
    id: number;
    full_name: string;
    owner: string;
    repo: string;
    avatar_url: string;
    description: string | null;
    language: string | null;
    topics: string[];
    homepage: string | null;
    archived: boolean;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    [key: string]: unknown;
  };
}

function mapRow(row: SnapshotRow): TrendingRepo {
  const r = row.repositories;
  return {
    id: r.id,
    full_name: r.full_name,
    owner: r.owner,
    repo: r.repo,
    avatar_url: r.avatar_url,
    description: r.description,
    language: r.language,
    topics: r.topics ?? [],
    homepage: r.homepage,
    archived: r.archived,
    fork: r.fork,
    created_at: r.created_at,
    updated_at: r.updated_at,
    pushed_at: r.pushed_at,
    // 变动数据统一从 snapshot 读取
    stargazers_count: row.stargazers_count,
    forks_count: row.forks_count,
    since: row.since,
    rank: row.rank,
    snapshot_stargazers_count: row.stargazers_count,
    snapshot_forks_count: row.forks_count,
    snapshot_fetched_at: row.fetched_at,
  };
}

/**
 * 获取 Trending 仓库列表
 * 按 rank 升序排列，最多返回 50 条
 */
export async function getTrendingRepos(
  filters: TrendingFilters,
): Promise<TrendingRepo[]> {
  const supabase = getClient();

  const query = supabase
    .from("trending_snapshots")
    .select(
      `
      since,
      rank,
      stargazers_count,
      forks_count,
      fetched_at,
      repositories!inner(*)
    `,
    )
    .limit(200);

  if (filters.language) {
    query.eq("repositories.language", filters.language);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取 Trending 数据失败: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  const rows = data as unknown as SnapshotRow[];

  // 每个仓库可能有多个 snapshot（PK: repo_id + since + fetched_at）
  // 保留最新和最旧两个 snapshot：最新用于排序，差值用于增长计算
  const latest = new Map<number, SnapshotRow>();
  const oldest = new Map<number, SnapshotRow>();
  for (const row of rows) {
    const repoId = row.repositories.id;
    const t = new Date(row.fetched_at).getTime();

    const curLatest = latest.get(repoId);
    if (!curLatest || t > new Date(curLatest.fetched_at).getTime()) {
      latest.set(repoId, row);
    }

    const curOldest = oldest.get(repoId);
    if (!curOldest || t < new Date(curOldest.fetched_at).getTime()) {
      oldest.set(repoId, row);
    }
  }

  const repos = Array.from(latest.values()).map((row) => {
    const repo = mapRow(row);
    // 用最旧 snapshot 的星数做对比基准，计算增长量
    const first = oldest.get(row.repositories.id);
    if (first && first.fetched_at !== row.fetched_at) {
      repo.snapshot_stargazers_count = first.stargazers_count;
    }
    return repo;
  });

  // 按 star 数量降序排列
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  return repos;
}

/**
 * 获取所有可用的编程语言列表
 */
export async function getAvailableLanguages(): Promise<string[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("trending_snapshots")
    .select("repositories!inner(language)");

  if (error) {
    throw new Error(`获取语言列表失败: ${error.message}`);
  }

  if (!data) return [];

  const languages = new Set<string>();
  for (const row of data) {
    // Supabase !inner join returns nested object as a single object
    const repo = (
      row as unknown as { repositories: { language: string | null } }
    ).repositories;
    if (repo?.language) {
      languages.add(repo.language);
    }
  }

  return Array.from(languages).sort();
}

/**
 * 获取单个仓库的完整详情（含 README 和所有时间范围的快照）
 * 不存在时返回 null
 */
export async function getRepoDetail(
  owner: string,
  repo: string,
): Promise<RepoDetail | null> {
  const supabase = getClient();

  // 1. 查询仓库元数据
  const { data: repoRow, error: repoError } = await supabase
    .from("repositories")
    .select("*")
    .eq("owner", owner)
    .eq("repo", repo)
    .single();

  if (repoError || !repoRow) return null;

  // 2. 并行查询 README 和所有快照
  const [readmeResult, snapshotsResult] = await Promise.all([
    supabase.from("readmes").select("*").eq("repo_id", repoRow.id).maybeSingle(),
    supabase
      .from("trending_snapshots")
      .select("*")
      .eq("repo_id", repoRow.id)
      .order("fetched_at", { ascending: false }),
  ]);

  const readmeRow = readmeResult.data;
  const snapshotRows = (snapshotsResult.data ?? []) as unknown as TrendSnapshot[];
  // 变动数据从最新 snapshot 读取
  const latestSnapshot = snapshotRows[0] ?? null;

  return {
    id: repoRow.id,
    full_name: repoRow.full_name,
    owner: repoRow.owner,
    repo: repoRow.repo,
    avatar_url: repoRow.avatar_url,
    description: repoRow.description,
    language: repoRow.language,
    topics: repoRow.topics ?? [],
    license: repoRow.license,
    homepage: repoRow.homepage,
    default_branch: repoRow.default_branch,
    archived: repoRow.archived,
    fork: repoRow.fork,
    created_at: repoRow.created_at,
    updated_at: repoRow.updated_at,
    pushed_at: repoRow.pushed_at,
    stargazers_count: latestSnapshot?.stargazers_count ?? 0,
    forks_count: latestSnapshot?.forks_count ?? 0,
    open_issues_count: latestSnapshot?.open_issues_count ?? 0,
    fetched_at: latestSnapshot?.fetched_at ?? repoRow.updated_at,
    commit_activity: Array.isArray(repoRow.commit_activity)
      ? repoRow.commit_activity
      : repoRow.commit_activity && typeof repoRow.commit_activity === "object"
        ? (repoRow.commit_activity as { all?: number[] }).all ?? null
        : null,
    contributor_count:
      typeof repoRow.contributor_count === "number"
        ? repoRow.contributor_count
        : null,
    release_count:
      typeof repoRow.release_count === "number"
        ? repoRow.release_count
        : null,
    latest_release_at:
      typeof repoRow.latest_release_at === "string"
        ? repoRow.latest_release_at
        : null,
    readme_content: readmeRow?.content ?? null,
    readme_size_bytes: readmeRow?.size_bytes ?? null,
    readme_fetched_at: readmeRow?.fetched_at ?? null,
    snapshots: snapshotRows.map((s) => ({
      since: s.since,
      rank: s.rank,
      stargazers_count: s.stargazers_count,
      forks_count: s.forks_count,
      open_issues_count: s.open_issues_count,
      fetched_at: s.fetched_at,
    })),
  };
}
