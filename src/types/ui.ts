/** 趋势时间范围 */
export type TimeRange = "daily" | "weekly" | "monthly";

/** 单次快照的排名与指标数据 */
export interface TrendSnapshot {
  since: string;
  rank: number;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  fetched_at: string;
}

/** 仓库完整详情（含 README 与所有时间范围的快照） */
export interface RepoDetail {
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
  readme_content: string | null;
  readme_size_bytes: number | null;
  readme_fetched_at: string | null;
  snapshots: TrendSnapshot[];
}

/** 页面展示用的仓库 + 快照组合数据 */
export interface TrendingRepo {
  // ── 仓库元数据 ──
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
  // ── 快照数据 ──
  since: string;
  rank: number;
  snapshot_stargazers_count: number;
  snapshot_forks_count: number;
  snapshot_fetched_at: string;
}

/** 页面筛选参数 */
export interface TrendingFilters {
  since: TimeRange;
  language?: string;
}
