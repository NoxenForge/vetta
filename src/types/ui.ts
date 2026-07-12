/** GitHub 日级 commit 数据（一周） */
export interface DailyCommitWeek {
  days: number[];  // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  total: number;
  week: number;    // Unix timestamp
}

/** 单条指标历史记录 */
export interface MetricsHistoryPoint {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  contributor_count: number | null;
  release_count: number;
  pushed_at: string | null;
  snapshot_at: string;
}

/** 仓库完整详情（含 README 与历史数据） */
export interface RepoDetail {
  // ── 静态字段（来自 repositories）──
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
  // ── 动态字段（来自 repository_metrics）──
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
  commit_activity: DailyCommitWeek[] | null;
  fetched_at: string;
  // ── README ──
  readme_content: string | null;
  readme_size_bytes: number | null;
  readme_fetched_at: string | null;
  // ── 历史快照 ──
  history: MetricsHistoryPoint[];
}

/** 页面展示用的仓库 + 指标组合数据 */
export interface TrendingRepo {
  // ── 仓库静态元数据 ──
  id: number;
  full_name: string;
  owner: string;
  repo: string;
  html_url: string;
  avatar_url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  homepage: string | null;
  visibility: string;
  archived: boolean;
  fork: boolean;
  is_template: boolean;
  github_created_at: string;
  github_updated_at: string;
  // ── 当前动态指标 ──
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  // ── 最旧快照的星数（用于计算增长）──
  oldest_stargazers_count: number;
}

/** 页面筛选参数 */
export interface TrendingFilters {
  language?: string;
}
