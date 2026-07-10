import type { JobContext } from "@/jobs/scheduler/types";

export interface Fetcher<T> {
  name: string;
  fetch(owner: string, repo: string, ctx: JobContext): Promise<T>;
}

// ── 仓库元数据 ──────────────────────────────────────

export interface Repository {
  id: number;
  full_name: string;
  owner: string;
  repo: string;
  avatar_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  default_branch: string;
  archived: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  fetched_at: string;
}

export const repositoryKey = (r: Repository): string => String(r.id);

// ── Trending 快照 ───────────────────────────────────

export interface TrendingSnapshot {
  repo_id: number;
  since: string;
  rank: number;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  fetched_at: string;
}

export const snapshotKey = (s: TrendingSnapshot): string =>
  `${s.repo_id}:${s.since}`;

// ── README 内容 ─────────────────────────────────────

export interface Readme {
  repo_id: number;
  content: string;
  size_bytes: number;
  fetched_at: string;
}

export const readmeKey = (r: Readme): string => String(r.repo_id);

// ── 工程指标（Metrics Dashboard）────────────────────────

/** Commit 活跃度（52 周数组） */
export interface CommitParticipation {
  repo_id: number;
  all: number[];
  fetched_at: string;
}

export const commitParticipationKey = (c: CommitParticipation): string =>
  String(c.repo_id);

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
