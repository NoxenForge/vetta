import type { JobContext } from "@/jobs/scheduler/types";

export interface Fetcher<T> {
  name: string;
  fetch(owner: string, repo: string, ctx: JobContext): Promise<T>;
}

// ── 仓库元数据（从 GitHub API 返回的完整数据）────────────────

export interface Repository {
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
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  fetched_at: string;
}

/** repositories 表可写入的字段（静态字段 + github 时间戳） */
export type RepoRow = Pick<
  Repository,
  | "id"
  | "full_name"
  | "owner"
  | "repo"
  | "html_url"
  | "avatar_url"
  | "description"
  | "language"
  | "topics"
  | "license"
  | "homepage"
  | "default_branch"
  | "visibility"
  | "archived"
  | "fork"
  | "is_template"
  | "github_created_at"
  | "github_updated_at"
>;

export const repositoryKey = (r: Repository): string => String(r.id);

// ── 当前指标（repository_metrics 表）────────────────────────

export interface MetricsRow {
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
  commit_activity: DailyCommitActivity["weeks"] | null;
  fetched_at: string;
}

/** 从 Repository + 工程指标组装 MetricsRow */
export function toMetricsRow(
  repo: Repository,
  extra?: {
    contributor_count?: number | null;
    release_count?: number;
    latest_release_at?: string | null;
    commit_activity?: DailyCommitActivity["weeks"] | null;
    watchers_count?: number;
    subscribers_count?: number;
    network_count?: number;
    size?: number;
  },
): MetricsRow {
  return {
    repo_id: repo.id,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    watchers_count: extra?.watchers_count ?? 0,
    subscribers_count: extra?.subscribers_count ?? 0,
    open_issues_count: repo.open_issues_count,
    network_count: extra?.network_count ?? 0,
    size: extra?.size ?? 0,
    contributor_count: extra?.contributor_count ?? null,
    release_count: extra?.release_count ?? 0,
    latest_release_at: extra?.latest_release_at ?? null,
    pushed_at: repo.pushed_at,
    commit_activity: extra?.commit_activity ?? null,
    fetched_at: repo.fetched_at,
  };
}

// ── 指标历史快照（repository_metrics_history 表）─────────────

export interface MetricsHistoryRecord {
  repo_id: number;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  contributor_count: number | null;
  release_count: number;
  pushed_at: string | null;
  snapshot_at: string;
}

// ── README 内容（repository_readmes 表）──────────────────────

export interface Readme {
  repo_id: number;
  content: string;
  content_hash: string;
  etag: string | null;
  size_bytes: number;
  fetched_at: string;
}

export const readmeKey = (r: Readme): string => String(r.repo_id);

// ── 工程指标（Metrics Dashboard）──────────────────────────

/** Commit 活跃度（52 周数组） */
export interface CommitParticipation {
  repo_id: number;
  all: number[];
  fetched_at: string;
}

export const commitParticipationKey = (c: CommitParticipation): string =>
  String(c.repo_id);

/** 日级 commit 数据（GitHub /stats/commit_activity 原始格式） */
export interface DailyCommitActivity {
  repo_id: number;
  /** 每周的每日提交数，week[0]=周日，week[6]=周六 */
  weeks: { days: number[]; total: number; week: number }[];
  fetched_at: string;
}

export const dailyCommitActivityKey = (d: DailyCommitActivity): string =>
  String(d.repo_id);

/** Release 摘要 */
export interface ReleaseSummary {
  repo_id: number;
  release_count: number;
  latest_release_at: string | null;
  fetched_at: string;
}

export const releaseSummaryKey = (r: ReleaseSummary): string =>
  String(r.repo_id);

/** 贡献者总数 */
export interface ContributorCount {
  repo_id: number;
  contributor_count: number;
  fetched_at: string;
}

export const contributorCountKey = (c: ContributorCount): string =>
  String(c.repo_id);
