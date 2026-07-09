import type { JobContext } from "@/jobs/scheduler/types";

/** Trending 查询参数 */
export interface TrendingOptions {
  since: "daily" | "weekly" | "monthly";
  language?: string;
  spoken_language_code?: string;
}

/** Discovery 发现的目标仓库（带排名） */
export interface Candidate {
  /** Trending 页面排名（1-based） */
  rank: number;
  owner: string;
  repo: string;
}

export interface Discovery {
  name: string;
  discover(ctx: JobContext, options: TrendingOptions): Promise<Candidate[]>;
}
