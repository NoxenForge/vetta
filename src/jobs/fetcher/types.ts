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
