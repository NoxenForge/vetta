import { createClient } from "@supabase/supabase-js";
import type {
  TrendingRepo,
  TrendingFilters,
  RepoDetail,
  MetricsHistoryPoint,
} from "@/types/ui";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("缺少 Supabase 环境变量");
  }
  return createClient(supabaseUrl, supabaseKey);
}

// ── 原始行类型（Supabase join 返回格式）─────────────────

interface RepoRow {
  id: number;
  full_name: string;
  owner: string;
  repo: string;
  html_url: string;
  avatar_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  default_branch: string;
  visibility: string;
  archived: boolean;
  fork: boolean;
  is_template: boolean;
  github_created_at: string;
  github_updated_at: string;
}

interface MetricsRow {
  repo_id: number;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  subscribers_count: number;
  open_issues_count: number;
  network_count: number;
  size: number;
  contributor_count: number | null;
  release_count: number;
  latest_release_at: string | null;
  pushed_at: string;
  commit_activity: unknown | null;
  fetched_at: string;
}

interface HistoryRow {
  id: number;
  repo_id: number;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  contributor_count: number | null;
  release_count: number;
  pushed_at: string | null;
  snapshot_at: string;
}

interface ReadmeRow {
  repo_id: number;
  content: string;
  size_bytes: number;
  fetched_at: string;
}

// ── 辅助函数 ──────────────────────────────────────────

function toMetricsHistoryPoint(row: HistoryRow): MetricsHistoryPoint {
  return {
    stargazers_count: row.stargazers_count,
    forks_count: row.forks_count,
    open_issues_count: row.open_issues_count,
    contributor_count: row.contributor_count,
    release_count: row.release_count,
    pushed_at: row.pushed_at,
    snapshot_at: row.snapshot_at,
  };
}

// ── 获取 Trending 仓库列表 ─────────────────────────────

export async function getTrendingRepos(
  filters: TrendingFilters,
): Promise<TrendingRepo[]> {
  const supabase = getClient();

  // 查询：repository_metrics JOIN repositories
  let query = supabase
    .from("repository_metrics")
    .select(
      `
      repo_id,
      stargazers_count,
      forks_count,
      open_issues_count,
      pushed_at,
      repositories!inner(*)
    `,
    )
    .order("stargazers_count", { ascending: false });

  if (filters.language) {
    query = query.eq("repositories.language", filters.language);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取 Trending 数据失败: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // 获取每个仓库的最旧历史快照（用于 star growth 计算）
  const repoIds = data.map((d) => (d as Record<string, unknown>).repo_id as number);
  const { data: oldestSnapshots } = await supabase
    .from("repository_metrics_history")
    .select("repo_id, stargazers_count")
    .in("repo_id", repoIds)
    .order("snapshot_at", { ascending: true });

  // 按 repo_id 分组取最早的那条
  const oldestByRepo = new Map<number, number>();
  if (oldestSnapshots) {
    for (const s of oldestSnapshots) {
      if (!oldestByRepo.has(s.repo_id)) {
        oldestByRepo.set(s.repo_id, s.stargazers_count);
      }
    }
  }

  // 组装 TrendingRepo 数组
  const repos: TrendingRepo[] = [];
  for (const row of data) {
    const d = row as Record<string, unknown>;
    const r = d.repositories as RepoRow;
    const oldestStars = oldestByRepo.get(r.id) ?? (d.stargazers_count as number);

    repos.push({
      id: r.id,
      full_name: r.full_name,
      owner: r.owner,
      repo: r.repo,
      html_url: r.html_url,
      avatar_url: r.avatar_url,
      description: r.description,
      language: r.language,
      topics: r.topics,
      homepage: r.homepage,
      visibility: r.visibility,
      archived: r.archived,
      fork: r.fork,
      is_template: r.is_template,
      github_created_at: r.github_created_at,
      github_updated_at: r.github_updated_at,
      stargazers_count: d.stargazers_count as number,
      forks_count: d.forks_count as number,
      open_issues_count: d.open_issues_count as number,
      pushed_at: d.pushed_at as string,
      oldest_stargazers_count: oldestStars,
    });
  }

  return repos;
}

// ── 获取所有可用语言 ───────────────────────────────────

export async function getAvailableLanguages(): Promise<string[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("repositories")
    .select("language");

  if (error) {
    throw new Error(`获取语言列表失败: ${error.message}`);
  }

  if (!data) return [];

  const languages = new Set<string>();
  for (const row of data) {
    if (row.language) {
      languages.add(row.language);
    }
  }

  return Array.from(languages).sort();
}

// ── 获取单个仓库完整详情 ───────────────────────────────

export async function getRepoDetail(
  owner: string,
  repo: string,
): Promise<RepoDetail | null> {
  const supabase = getClient();

  // 1. 查询仓库静态字段
  const { data: repoRow, error: repoError } = await supabase
    .from("repositories")
    .select("*")
    .eq("owner", owner)
    .eq("repo", repo)
    .single();

  if (repoError || !repoRow) return null;
  const r = repoRow as unknown as RepoRow;

  // 2. 并行查询 metrics + README + 历史快照
  const [metricsResult, readmeResult, historyResult] = await Promise.all([
    supabase
      .from("repository_metrics")
      .select("*")
      .eq("repo_id", r.id)
      .maybeSingle(),
    supabase
      .from("repository_readmes")
      .select("*")
      .eq("repo_id", r.id)
      .maybeSingle(),
    supabase
      .from("repository_metrics_history")
      .select("*")
      .eq("repo_id", r.id)
      .order("snapshot_at", { ascending: true }),
  ]);

  const metrics = (metricsResult.data ?? null) as MetricsRow | null;
  const readme = (readmeResult.data ?? null) as ReadmeRow | null;
  const historyRows = (historyResult.data ?? []) as unknown as HistoryRow[];

  return {
    // 静态
    id: r.id,
    full_name: r.full_name,
    owner: r.owner,
    repo: r.repo,
    html_url: r.html_url,
    avatar_url: r.avatar_url,
    description: r.description,
    language: r.language,
    topics: r.topics ?? [],
    license: r.license,
    homepage: r.homepage,
    default_branch: r.default_branch,
    visibility: r.visibility,
    archived: r.archived,
    fork: r.fork,
    is_template: r.is_template,
    github_created_at: r.github_created_at,
    github_updated_at: r.github_updated_at,
    // 动态
    stargazers_count: metrics?.stargazers_count ?? 0,
    forks_count: metrics?.forks_count ?? 0,
    watchers_count: metrics?.watchers_count ?? 0,
    subscribers_count: metrics?.subscribers_count ?? 0,
    open_issues_count: metrics?.open_issues_count ?? 0,
    network_count: metrics?.network_count ?? 0,
    size: metrics?.size ?? 0,
    contributor_count: metrics?.contributor_count ?? null,
    release_count: metrics?.release_count ?? 0,
    latest_release_at: metrics?.latest_release_at ?? null,
    pushed_at: metrics?.pushed_at ?? r.github_updated_at,
    commit_activity: Array.isArray(metrics?.commit_activity)
      ? (metrics!.commit_activity as unknown as import("@/types/ui").DailyCommitWeek[])
      : null,
    fetched_at: metrics?.fetched_at ?? "",
    // README
    readme_content: readme?.content ?? null,
    readme_size_bytes: readme?.size_bytes ?? null,
    readme_fetched_at: readme?.fetched_at ?? null,
    // 历史
    history: historyRows.map(toMetricsHistoryPoint),
  };
}
