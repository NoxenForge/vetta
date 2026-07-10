import { createClient } from "@supabase/supabase-js";
import type {
  TrendingRepo,
  TrendingFilters,
  TimeRange,
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

/** 快照行原始数据（Supabase join 返回格式） */
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
    stargazers_count: number;
    forks_count: number;
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
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
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
    .eq("since", filters.since)
    .order("rank", { ascending: true })
    .limit(50);

  if (filters.language) {
    query.eq("repositories.language", filters.language);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取 Trending 数据失败: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  return (data as unknown as SnapshotRow[]).map(mapRow);
}

/**
 * 获取指定时间范围内所有可用的编程语言列表
 */
export async function getAvailableLanguages(
  since: TimeRange,
): Promise<string[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("trending_snapshots")
    .select("repositories!inner(language)")
    .eq("since", since);

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
    stargazers_count: repoRow.stargazers_count,
    forks_count: repoRow.forks_count,
    open_issues_count: repoRow.open_issues_count,
    fetched_at: repoRow.fetched_at,
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
